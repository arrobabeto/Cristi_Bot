export default function HowItWorksPage() {
  return (
    <main className="page">
      <style>{`
        :root {
          --bg: #f7f6f3;
          --surface: #ffffff;
          --ink: #1f2a2e;
          --muted: #5c6a70;
          --accent: #0d9488;
          --accent-soft: rgba(13, 148, 136, 0.12);
          --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          --radius: 18px;
        }

        * {
          box-sizing: border-box;
        }

        body {
          background: var(--bg);
          color: var(--ink);
        }

        .page {
          min-height: 100vh;
          padding: 72px 20px 96px;
          font-family: "IBM Plex Sans", "Space Grotesk", "Helvetica Neue", sans-serif;
          background: radial-gradient(circle at top left, #ffffff 0%, #f7f6f3 45%, #f1efe9 100%);
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .hero {
          background: var(--surface);
          border-radius: calc(var(--radius) + 6px);
          padding: 36px 40px;
          box-shadow: var(--shadow);
          display: grid;
          gap: 16px;
        }

        .eyebrow {
          color: var(--accent);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 12px;
        }

        h1 {
          font-size: clamp(2rem, 3vw, 2.6rem);
          margin: 0;
        }

        .hero p {
          color: var(--muted);
          margin: 0;
          max-width: 760px;
          font-size: 1.05rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .card {
          background: var(--surface);
          border-radius: var(--radius);
          padding: 24px;
          box-shadow: var(--shadow);
          display: grid;
          gap: 14px;
        }

        .card h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .card p,
        .card li {
          color: var(--muted);
          font-size: 0.98rem;
        }

        .card ul {
          padding-left: 18px;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .commands {
          display: grid;
          gap: 12px;
        }

        .command-row {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 14px;
          display: grid;
          gap: 6px;
        }

        .command-row code,
        pre code {
          font-family: "IBM Plex Mono", "JetBrains Mono", "Fira Code", monospace;
          color: #0f172a;
        }

        .command-row code {
          font-weight: 600;
        }

        pre {
          margin: 0;
          background: #0f172a;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 14px;
          overflow-x: auto;
        }

        pre code {
          color: inherit;
          font-size: 0.9rem;
        }

        .quick-panel {
          border: 1px solid rgba(13, 148, 136, 0.2);
        }

        .pill-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pill {
          background: #f1f5f9;
          color: #0f172a;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .footer-note {
          text-align: center;
          color: var(--muted);
          font-size: 0.95rem;
        }

        @media (max-width: 640px) {
          .hero {
            padding: 28px 22px;
          }

          .card {
            padding: 20px;
          }
        }
      `}</style>

      <div className="container">
        <section className="hero">
          <span className="eyebrow">Documentacion</span>
          <h1>Como funciona el bot financiero en Telegram</h1>
          <p>
            Esta guia resume los comandos reales, el flujo diario recomendado y las buenas practicas para
            registrar tus movimientos con claridad. Todo esta pensado para ser rapido, consistente y seguro.
          </p>
          <div className="pill-list" aria-label="Resumen rapido">
            <span className="pill">Mensajes cortos</span>
            <span className="pill">Comandos textuales</span>
            <span className="pill">Sin integraciones externas</span>
          </div>
        </section>

        <section className="grid">
          <article className="card">
            <span className="tag">Que hace el bot</span>
            <h2>Que hace el bot</h2>
            <p>
              Convierte mensajes en acciones financieras: registra transacciones, actualiza saldos y
              prepara resumentes mensuales. Si falta informacion, te pide lo minimo para completar el registro.
            </p>
            <ul>
              <li>Calcula presupuestos y variable disponible.</li>
              <li>Guarda deudas con prioridad, minimos y fechas.</li>
              <li>Simula compras antes de gastar.</li>
            </ul>
          </article>

          <article className="card quick-panel">
            <span className="tag">Quick Commands</span>
            <h2>Quick Commands</h2>
            <p>Copialos tal cual en Telegram para ejecutar tareas frecuentes.</p>
            <div className="commands">
              <pre><code>balance 15230.50</code></pre>
              <pre><code>budget 2024-08 9000</code></pre>
              <pre><code>summary 2024-08</code></pre>
              <pre><code>simulate 450 "supermercado" 2024-08-12</code></pre>
            </div>
          </article>
        </section>

        <section className="grid">
          <article className="card">
            <span className="tag">Comandos disponibles</span>
            <h2>Comandos disponibles</h2>
            <div className="commands">
              <div className="command-row">
                <code>balance 1500</code>
                <span>Actualiza el saldo bancario actual en MXN.</span>
              </div>
              <div className="command-row">
                <code>budget 2024-08 8000</code>
                <span>Define el presupuesto variable para un mes.</span>
              </div>
              <div className="command-row">
                <code>debt Tarjeta Oro priority=alta balance=12000 min=600 due=5</code>
                <span>Guarda o actualiza una deuda con campos clave.</span>
              </div>
              <div className="command-row">
                <code>simulate 450 "restaurante" 2024-08-15</code>
                <span>Simula si una compra cabe en tu presupuesto.</span>
              </div>
              <div className="command-row">
                <code>summary 2024-08</code>
                <span>Muestra ingresos, gastos y variable restante.</span>
              </div>
              <div className="command-row">
                <code>"250 uber"</code>
                <span>Registra una transaccion; el bot pedira datos si faltan.</span>
              </div>
            </div>
          </article>

          <article className="card">
            <span className="tag">Ejemplos (copy/paste)</span>
            <h2>Ejemplos (copy/paste)</h2>
            <pre><code>{`balance 12450.75
budget 2024-09 9500
"1200 renta" 2024-09-01
"450 gasolina" cat:transporte 2024-09-05
simulate 799 "audifonos" 2024-09-10
summary 2024-09`}</code></pre>
            <p>Tip: usa comillas para la categoria o escribe <code>cat:</code> si prefieres etiquetas cortas.</p>
          </article>
        </section>

        <section className="grid">
          <article className="card">
            <span className="tag">Flujo diario recomendado</span>
            <h2>Flujo diario recomendado</h2>
            <ul>
              <li>Al iniciar el mes, actualiza <code>balance</code> y <code>budget</code>.</li>
              <li>Registra gastos y pagos apenas ocurran, en mensajes separados.</li>
              <li>Antes de compras grandes, usa <code>simulate</code> para validar.</li>
              <li>Revisa <code>summary</code> una vez por semana para ajustar.</li>
            </ul>
          </article>

          <article className="card">
            <span className="tag">Tips / Errores comunes</span>
            <h2>Tips / Errores comunes</h2>
            <ul>
              <li>Escribe montos sin simbolos extras para evitar ambiguedades.</li>
              <li>Incluye fecha cuando quieras registrar algo fuera del dia actual.</li>
              <li>En <code>debt</code>, recuerda <code>priority</code>; es obligatorio.</li>
              <li>Si el bot responde con dudas, agrega solo el dato faltante.</li>
            </ul>
          </article>
        </section>

        <section className="grid">
          <article className="card">
            <span className="tag">Seguridad (tokens/keys)</span>
            <h2>Seguridad (tokens/keys)</h2>
            <p>
              El bot usa variables de entorno para autenticar el webhook y el acceso a herramientas internas.
              Nunca compartas tokens en el chat ni en capturas de pantalla.
            </p>
            <ul>
              <li>Guarda <code>TELEGRAM_BOT_TOKEN</code> y <code>TOOLS_API_KEY</code> solo en tu hosting.</li>
              <li>Activa <code>TELEGRAM_WEBHOOK_SECRET</code> para validar cada solicitud.</li>
              <li>Rota claves si sospechas que alguien las vio.</li>
            </ul>
          </article>

          <article className="card">
            <span className="tag">Respaldo rapido</span>
            <h2>Checklist rapido</h2>
            <ul>
              <li>Define saldo y presupuesto al iniciar el mes.</li>
              <li>Registra cada movimiento el mismo dia.</li>
              <li>Usa una categoria clara y consistente.</li>
              <li>Consulta el resumen para tomar decisiones.</li>
            </ul>
          </article>
        </section>

        <p className="footer-note">Disponible tambien en produccion: /how-it-works</p>
      </div>
    </main>
  );
}
