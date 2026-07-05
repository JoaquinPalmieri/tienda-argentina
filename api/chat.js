export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const PRODUCTOS = [
    { nombre: "Yerba Mate Playadito 1 kg",              precio: 10.00, stock: 1  },
    { nombre: "Yerba Mate Amanda 1 kg",                 precio: 11.00, stock: 9  },
    { nombre: "Yerba Mate Rosamonte Tradicional 1 kg",  precio: 12.00, stock: 8  },
    { nombre: "Fernet Branca Italiano 70 cl",           precio: 30.00, stock: 5  },
    { nombre: "Chocolinas 150 g",                       precio:  3.00, stock: 18 },
    { nombre: "Alfajor Havanna Negro",                  precio:  4.00, stock: 7  },
    { nombre: "Alfajor Havanna Blanco",                 precio:  4.00, stock: 13 },
    { nombre: "Bizcochitos Agridulces Don Satur 200 g", precio:  5.00, stock: 8  },
    { nombre: "Palitos Salados de Queso 140 g",         precio:  4.50, stock: 0  },
    { nombre: "Havannets Chocolate",                    precio:  4.00, stock: 0  },
    { nombre: "Caramelos Fizz x 5",                    precio:  2.00, stock: 0  },
    { nombre: "Yerba Mate Aguamate Organic 500 g",      precio: 11.00, stock: 0  },
  ];

  const SYSTEM_PROMPT = `Sos el asistente virtual de "Argentina en Casa", una tienda de productos argentinos en Dubrovnik, Croacia. Hablás en español informal argentino (vos, che, etc.). Sos amigable, conciso y eficiente.

Tu trabajo es ayudar a los clientes a armar su pedido.

CATÁLOGO CON STOCK REAL:
${PRODUCTOS.map(p => `- ${p.nombre}: €${p.precio.toFixed(2)} | ${p.stock > 0 ? p.stock + " unidades disponibles" : "SIN STOCK - agotado"}`).join("\n")}

REGLAS:
- Solo vendés productos con stock > 0. Si piden uno agotado, disculpate y ofrecé alternativas.
- Si piden más unidades de las disponibles, avisales cuántas quedan.
- Cuando el cliente termine de elegir, pedile nombre completo y dirección en Dubrovnik.
- Con toda la info, generá el resumen del pedido.
- El resumen DEBE incluir la línea exacta "PEDIDO_LISTO" sola en una línea, seguida del resumen en este formato:
  Nombre: [nombre]
  Dirección: [dirección]
  Productos:
  - [producto] x[cantidad] = €[subtotal]
  TOTAL: €[total]

Sé breve. No repitas el catálogo completo salvo que te lo pidan explícitamente.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 800,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...req.body.messages
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.choices?.[0]?.message?.content || 'Disculpá, no pude procesar tu mensaje.';

    // Devolvemos en formato compatible con chat.html
    res.status(200).json({
      content: [{ type: 'text', text: reply }]
    });

  } catch (err) {
    res.status(500).json({ error: 'Error al contactar la IA', detail: err.message });
  }
}
