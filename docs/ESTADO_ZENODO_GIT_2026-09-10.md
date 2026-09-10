# Estado - Zenodo y Git - 2026-09-10

## Zenodo (por API, todas las versiones)
14 registros. Totales: 649 vistas, 488 unicas, 41 descargas.
Rick App (concepto): 38 vistas, 20 unicas, 14 descargas. 3 versiones publicadas, sin borradores.
Requests / inbox: vacio.

## Git (repo yunusdim/rick-app)
Link de la app (https://rick-app-three.vercel.app) presente y clickeable en el campo Website (About) y en el README (linea Probar). DOI de Zenodo tambien enlazado. Sin cambios necesarios.

## Vercel
Web Analytics activado (plan Hobby, gratis) el 2026-09-10. Cuenta visitantes desde la activacion; no rellena hacia atras. Pendiente: verificar el componente @vercel/analytics en el codigo y redeploy.

## Regla registrada: visitas Zenodo y drafts colgados
En /me/uploads un registro publicado muestra 0 vistas cuando tiene un borrador de edicion colgado: la lista muestra la fila del draft (sin stats) en vez del publicado. La vista de comunidad no se afecta.
Prueba (2026-09-10): Rick App v3 mostraba 0; tras descartar el draft, 20.
Diagnostico: GET /api/records/{id}/draft -> 200 = draft colgado, 404 = limpio.
Correccion: descartar el borrador (Manage record -> descartar cambios, o DELETE /api/records/{id}/draft). No borra la version publicada.

## Que se hizo hoy
1. Chequeo de visitas por API de los 14 registros de Zenodo.
2. Verificacion del link de la app en GitHub (Website + README): ya estaba, sin commit.
3. Activacion de Web Analytics en Vercel.
4. Deteccion y descarte de un borrador colgado en la v3 de Rick App en Zenodo.

Estado verificado contra API y repositorio el 2026-09-10.
