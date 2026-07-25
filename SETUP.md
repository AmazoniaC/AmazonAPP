# ERP Amazonia — Guía de instalación

## Requisitos
- Node.js 18 o superior
- PostgreSQL 14 o superior

---

## 1. Instalar dependencias

```bash
npm install
```

---

## 2. Configurar la base de datos (PostgreSQL)

### En Windows
1. Descargar e instalar PostgreSQL desde https://www.postgresql.org/download/windows/
2. Durante la instalación, anotar la contraseña que le pones al usuario `postgres`
3. Abrir **pgAdmin** o **SQL Shell (psql)** y crear la base de datos:
   ```sql
   CREATE DATABASE erp_amazonia;
   ```

### En Linux/Mac
```bash
pg_ctlcluster 16 main start   # o: sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'erp123';"
sudo -u postgres psql -c "CREATE DATABASE erp_amazonia;"
```

---

## 3. Crear el archivo .env

Copiar `.env.example` como `.env` y completar con tus datos:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux / Mac
cp .env.example .env
```

Luego editar `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=la_contraseña_que_pusiste_al_instalar
DB_NAME=erp_amazonia
PORT=3001
```

---

## 4. Crear las tablas e insertar datos iniciales

```bash
npm run setup:db
```

---

## 5. Ejecutar la aplicación

Un solo comando arranca el backend y la app juntos:

```bash
npm run dev
```

Deberías ver algo así:

```
[API] ✅ Servidor ERP corriendo en http://localhost:3001
[API] ✅ PostgreSQL conectado (erp_amazonia)
[APP]   ➜  Local:   http://localhost:3000/
[APP]   ➜  Network: http://192.168.1.20:3000/
```

Abrir en el navegador: http://localhost:3000

> Si prefieres separarlos en dos terminales: `npm run dev:api` y `npm run dev:web`.

### Si aparece "No hay conexión con el servidor"

Significa que la app (puerto 3000) está arriba pero la API (puerto 3001) no.
Casi siempre es una de estas dos:

| Qué ves en la terminal | Qué pasa | Solución |
|---|---|---|
| Solo líneas `[APP]`, ninguna `[API]` | Arrancaste únicamente el frontend | Detén con Ctrl+C y ejecuta `npm run dev` |
| `⚠️ No se pudo conectar a PostgreSQL` | La base de datos está apagada | Enciende PostgreSQL (ver la sección de abajo) |

**Usuario demo:** admin@empresa.com / admin123

---

## 6. Abrir la app desde el celular

El computador donde corre la app hace de servidor. El celular solo necesita
estar en **la misma red WiFi**.

### Paso 1 — Averiguar la IP del computador

```bash
# Windows (PowerShell)
ipconfig
# Busca "Dirección IPv4" en tu adaptador WiFi, algo como 192.168.1.20

# Linux / Mac
hostname -I | awk '{print $1}'
```

Al arrancar `npm run dev`, Vite también la imprime directamente:

```
➜  Local:   http://localhost:3000/
➜  Network: http://192.168.1.20:3000/   ← esta es la que se usa en el celular
```

### Paso 2 — Abrirla en el celular

En el navegador del celular escribe esa dirección **con el puerto**:

```
http://192.168.1.20:3000
```

(Reemplaza `192.168.1.20` por la IP real de tu computador.)

### Paso 3 — Instalarla como aplicación (opcional pero recomendado)

Así queda con su propio ícono, a pantalla completa y sin barra del navegador:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*
- **iPhone (Safari):** botón Compartir → *Añadir a pantalla de inicio*

### Si no carga en el celular

| Síntoma | Causa habitual | Solución |
|---|---|---|
| No abre nada | El celular está en otra red (ej. datos móviles) | Conéctalo al mismo WiFi |
| No abre nada | El firewall de Windows bloquea el puerto | Permite Node.js en redes privadas, o abre el puerto 3000 |
| Abre pero sin datos | El backend no está corriendo | Verifica que `npm run server:dev` siga activo |
| Dejó de funcionar | La IP del computador cambió | Vuelve a mirarla con `ipconfig` / `hostname -I` |

> **Nota:** esto funciona solo dentro de tu red local. Para entrar desde fuera
> (datos móviles, otra ciudad) hay que publicar la app en un servidor con
> dominio y HTTPS — es un paso aparte.

---

## Si PostgreSQL se apaga (reinicio del PC)

```bash
# Windows: abrir Services y reiniciar "postgresql-x64-16"
# O desde PowerShell como administrador:
net start postgresql-x64-16

# Linux:
pg_ctlcluster 16 main start
```
