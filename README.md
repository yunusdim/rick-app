# Rick App

Instancia de RICK Runtime v9. Freeze 2026-09-08. El informe vigente confronta `edf34e5`, 2026-09-10.

El entorno arma el turno. El modelo solo genera texto. Cada quien trae su propia API key.

**Probar:** [rick-app-three.vercel.app](https://rick-app-three.vercel.app)  
**Informe:** Impieri, D. G. (2026). *Rick App: Fail-Closed Context Governance in the Browser*. Zenodo. [doi:10.5281/zenodo.22654842](https://doi.org/10.5281/zenodo.22654842) — concept DOI: resuelve siempre a la última versión.

Al abrir pide el **motor** y la **API key**. xAI, OpenAI, Anthropic, OpenRouter, Groq, Mistral, Gemini, o un endpoint OpenAI-compatible (`https://host/v1`). Queda en *tu* navegador. No gasta la cuota de nadie más.

Si el motor es como Grok, hay chat y voz. Si no, solo lo que ese motor trae. No se finge una voz.

## Qué es

Una mesa. Identidad global, ejes de trabajo, canon verbatim, paquete de trece bloques con estatus epistémico. Anti-invención. Chequeo léxico, sin juez-LLM. `/olvidar` con confirmación y respaldo.

El documento de hábitat vive adentro: Canon → hábitat. Con ese texto se puede reconstruir la física.

## Correr

```bash
npm install
npm run dev
```

No hace falta `XAI_API_KEY` en el servidor. La clave, el motor y el modelo viajan por `X-Rick-Key`, `X-Rick-Engine`, `X-Rick-Model`.

```bash
npm run build
npx tsx -e "import { runBank, bankScore } from './src/lib/rick/bank.ts'; console.log(bankScore(runBank()))"
```

Tag de freeze: `freeze-v9-2026-09-08`, en `151d7f4`. El informe del freeze confronta `b1df8bb`, treinta y un minutos posterior al commit taggeado: no son el mismo objeto.

La revisión inglesa vigente confronta `edf34e5`, que enmienda admisión post-stream, integridad de canon, huella documental por bytes del cuerpo original, contrato de transporte declarado, retención por eje, réplica local, cápsula exportable, una sola pestaña escritora y declaración de capacidades sin fingir.

`main` siguió después. `053116e` saca la marca `actualizada` del header: la identificación visible del build ya no está, y su ausencia no significa que la pestaña esté vieja.

Las fotos citadas: `git checkout 151d7f4`, `b1df8bb`, `edf34e5`.
