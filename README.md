# 🎓 KT-Pagos `v2.5`
### Plataforma Integral de Gestión Financiera y Control Académico para Tutores

[![React](https://img.shields.io/badge/React-18%2F19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend%20as%20a%20Service-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 📌 Propósito del Sistema

**KT-Pagos** es una plataforma avanzada de gestión financiera y control operativo de clases diseñada específicamente a la medida de tutores y educadores independientes. Su objetivo central es erradicar la incertidumbre en los cobros mensuales, ofreciendo:

- **Proyección Financiera Exacta:** Cálculo transparente en tiempo real de ingresos proyectados y ganados, unificando clases regulares, lecciones adicionales y bonos por desempeño.
- **Auditoría y Backoffice Financiero:** Trazabilidad estricta de pagos recibidos contra montos estimados, control de diferencias y gestión de deudas arrastradas entre periodos.
- **Rendimiento e Incentivos:** Modelo determinista para el cálculo y simulación de bonos mensuales basados en retención de estudiantes y requisitos académicos.
- **Control de Clases con Trazabilidad:** Monitoreo diario de turnos con detección de reprogramaciones, cancelaciones y horas exactas por grupo.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend Core** | [React](https://react.dev/) | Arquitectura de componentes desacoplada, hooks personalizados y renderizado reactivo. |
| **Bundler & Tooling** | [Vite](https://vitejs.dev/) | Entorno de desarrollo ultrarrápido y compilación de producción optimizada. |
| **Estilos & Diseño** | [Tailwind CSS](https://tailwindcss.com/) | Sistema de tokens utilitarios con soporte para temas oscuro/claro y variables CSS dinámicas (`--accent-color`). |
| **Base de Datos & Auth** | [Supabase](https://supabase.com/) | Motor PostgreSQL relacional, autenticación segura y políticas de seguridad a nivel de fila (RLS). |
| **Visualización** | [Recharts](https://recharts.org/) | Gráficas analíticas e históricas de evolución financiera periodo a periodo. |
| **Iconografía** | [Lucide React](https://lucide.dev/) | Set de iconos vectoriales consistentes y modernos. |

---

## 🚀 Módulos Core

### 1. 📊 Dashboard Principal
El centro de mando de la actividad diaria del tutor:
- **Hero Banner Proyectado:** Muestra el total mensual estimado (clases regulares + clases extras + bono acumulado) con desglose interactivo.
- **KPIs Animados:** Tarjetas con conteo dinámico (`useCountUp`) para *Ganado este Mes*, *Mes Anterior*, *Clases Impartidas* y *Grupos Activos*.
- **Gráfica Histórica:** Comparativa visual entre lo cobrado y lo estimado en los últimos periodos ajustables (4 a 12 periodos).
- **Clases Pendientes con Horario Detallado:** Lista cronológica de clases a impartir con día de la semana y hora formateada (`Jue 22/10/2026 · 16:30`), indicador de estado atrasado o aplazado y acciones rápidas para completar, reprogramar o cancelar.

### 2. 💳 Finanzas (Backoffice)
Auditoría y conciliación financiera de nivel empresarial:
- **Cabecera Optimizada:** Selector de año alineado horizontalmente con el título para maximizar el área útil en dispositivos móviles.
- **Hero del Periodo Actual:** Vista panorámica del corte en curso con acceso inmediato al botón *Ver detalles del corte*, estatus de periodo y fechas de inicio/fin.
- **Conciliación de Cifras:** Diferenciación entre *Total Proyectado*, *Ganado/Pagado* y *Diferencia* (en verde o color de acento según superávit/déficit).
- **Gestión de Deudas Arrastradas:** Identificación y resolución de saldos pendientes de periodos anteriores (`deuda_anterior`, `deuda_resuelta`).
- **Modal de Detalle del Corte:** Desglose pormenorizado de clases regulares, extras, multiplicador aplicado y edición directa del monto transferido por la institución.

### 3. 🏆 Módulo de Bonos
Motor de cálculo de incentivos por rendimiento:
- **Validación de Requisitos:** Interruptor para certificar el cumplimiento de los estándares del mes (alumnos mínimos, grupos y métricas).
- **Gestión de Retenciones por Niveles:** Evaluación configurable para R1, R2 y R3 con 3 grados:
  - `None` (0%)
  - `Good` (+5%)
  - `Amazing` (+10%)
- **Aislamiento Matemático:** El porcentaje acumulado de bono aplica **estrictamente sobre las clases regulares**, garantizando que las clases adicionales se paguen por tarifa neta sin distorsión.
- **Simulador Rápido:** Modal independiente e interactivo que permite proyectar escenarios hipotéticos de retención sin alterar los registros reales de la base de datos.
- **Diseño Anti-Desplazamiento:** Contenedores de ancho fijo para insignias de estado que evitan saltos en la interfaz al cambiar de mes.

### 4. 👥 Grupos y Clases
Gestión operativa del alumnado:
- **Ficha de Grupo:** Consulta de horario asignado, enlace directo a Backoffice institucional y progreso de lecciones completadas vs. contratadas.
- **Estados de Clase Rigurosos:**
  - `Programada`: En calendario futuro.
  - `Completada`: Impartida con registro para nómina.
  - `Aplazada`: Reprogramada con trazabilidad completa mediante el campo booleano `fue_aplazada`.
  - `Cancelada`: Excluida de la contabilidad de ingresos.
- **Creación de Clases Extras:** Modal para incorporar tutorías individuales o de refuerzo asignando tarifas personalizadas.

---

## ⚡ Guía de Uso Rápido

### 1. Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/KT-pagos.git
   cd KT-pagos
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto con las credenciales de tu proyecto en Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

### 2. Sistema de Respaldos e Importación JSON

En la sección de **Configuración** dispones de herramientas de seguridad de datos:

- **Exportación Segura:** Genera un archivo `.json` que contiene todas tus tablas (`tarifas`, `periodos`, `grupos`, `clases`), incluyendo las columnas añadidas en la versión 2.5:
  - `periodos`: `requisitos_bono`, `r1_grado`, `r2_grado`, `r3_grado`.
  - `clases`: `fue_aplazada`.
- **Restauración Inteligente:** Procesa el archivo JSON en lotes y mediante `upsert` reinserta o actualiza la totalidad de los datos en orden relacional estricto (tarifas → periodos → grupos → clases), evitando errores de integridad foránea.

---

### 3. Personalización del Color de Acento

La aplicación utiliza la variable CSS `--accent-color` para teñir armoniosamente componentes clave (botones primarios, badges, tarjetas activas y progreso):

1. Ingresa a **Configuración** (`/configuracion`).
2. Localiza la sección **Color de Acento**.
3. Selecciona cualquiera de las paletas predefinidas (Ámbar, Esmeralda, Índigo, Rosa, etc.) o ingresa tu propio código hexadecimal mediante el selector nativo.
4. Tu preferencia se almacenará en `localStorage` y se sincronizará automáticamente con el modo claro u oscuro del sistema.

---

## 📄 Licencia

Desarrollado para uso interno y gestión privada de tutorías. Todos los derechos reservados.
