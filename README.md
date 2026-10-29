# Web meteo con Ecowitt + GitHub Pages (gratis)

Páginas:
- `index.html`: portada, datos actuales con mini-gráficas, todos los datos, pronóstico, radar, sol y luna, calidad del aire y polen.
- `graficas.html`: gráficas de 24 h, 48 h y 7 días, con descarga CSV.
- `historico.html`: récords, resumen mensual y datos diarios (se va llenando día a día).

Cómo funciona: cada 10 minutos una GitHub Action pide los datos de tu estación a ecowitt.net y los guarda en `data/`.
El pronóstico, la calidad del aire (CAMS) y el radar se cargan desde servicios gratuitos sin clave (Open-Meteo y RainViewer).

## Puesta en marcha
1. En la app WS View Plus, activa la subida a Ecowitt y comprueba que ves la estación en ecowitt.net.
2. En ecowitt.net > User Profile > API Keys: crea una Application Key y una API Key. Apunta la MAC de la consola.
3. Crea un repositorio público en GitHub y sube todo (incluida la carpeta `.github`).
4. Settings > Secrets and variables > Actions: crea `ECOWITT_APP_KEY`, `ECOWITT_API_KEY` y `ECOWITT_MAC`.
5. Settings > Pages: Deploy from a branch, rama `main`, carpeta `/ (root)`.
6. Actions > «Actualizar datos de la estación» > Run workflow.
7. Edita el bloque CONFIG al principio de `assets/comun.js`: nombre, coordenadas, altitud, etc.
8. Opcional: sube tu foto como `images/portada.jpg`.
