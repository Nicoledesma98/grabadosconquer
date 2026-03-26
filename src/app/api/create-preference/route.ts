import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! 
});

export async function POST(req: Request) {
  try {
    const { items, payerEmail, externalReference } = await req.json();

    const preference = await new Preference(client).create({
      body: {
        items: items.map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: 'ARS',
        })),
        payer: {
          email: payerEmail,
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL}/pago-procesando`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL}/pago-procesando`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pago-procesando`,
        },
        // auto_return: 'approved', // ← Desactivado temporalmente
        statement_descriptor: 'GRABADOS CONQUER',
        external_reference: externalReference,
      },
    });

    return NextResponse.json({ id: preference.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear preferencia' }, { status: 500 });
  }
}