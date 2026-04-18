# Testing en JavaScript — Guía completa para tests de eliminación

## ¿Qué es un test?

Un test es código que verifica que tu código funciona correctamente. Es como un "inspector de calidad" que revisa cada parte de tu app.

### Analogía: El control de calidad en una fábrica

```
Fabricas un producto (tu código)
    ↓
Lo envías a control de calidad (tests)
    ↓
El inspector verifica:
  - ¿Funciona?
  - ¿Tiene defectos?
  - ¿Cumple los requisitos?
    ↓
Si todo está bien: ✅ Aprobado
Si hay problemas: ❌ Rechazado
```

---

## Tipos de tests

### 1. Unit Tests (Tests unitarios)

Prueban una función individual en aislamiento.

```js
// Función a probar
const sumar = (a, b) => a + b;

// Test
test('sumar 2 + 3 debe devolver 5', () => {
    expect(sumar(2, 3)).toBe(5);
});
```

### 2. Integration Tests (Tests de integración)

Prueban cómo funcionan varias funciones juntas.

```js
// Prueba que deleteUser + reloadPage funcionan juntos
test('eliminar usuario debe actualizar la tabla', async () => {
    await deleteUser(5);
    await usersStore.reloadPage();
    expect(usersStore.getUsers()).not.toContain(5);
});
```

### 3. E2E Tests (End-to-End)

Prueban la app completa desde la perspectiva del usuario.

```js
// Simula: usuario hace click en Delete → tabla se actualiza
test('usuario puede eliminar un usuario desde la tabla', async () => {
    // 1. Abre la app
    // 2. Hace click en Delete
    // 3. Verifica que el usuario desapareció
});
```

---

## Frameworks de testing

Los más populares en JavaScript:

- **Jest** → Fácil, todo incluido, muy popular
- **Vitest** → Moderno, rápido, similar a Jest
- **Mocha** → Flexible, requiere más configuración
- **Cypress** → Para E2E tests

**Recomendación:** Usa **Vitest** porque es moderno y rápido.

---

## Instalación de Vitest

```bash
npm install -D vitest
```

Luego, en `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest --run"
  }
}
```

---

## Test básico de deleteUser

### Paso 1: Crear el archivo de test

Crea `src/users/use-cases/delete-user-by-id.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUser } from './delete-user-by-id';

describe('deleteUser', () => {
    
    beforeEach(() => {
        // Limpia los mocks antes de cada test
        vi.clearAllMocks();
    });

    it('debe hacer un DELETE request al endpoint correcto', async () => {
        // Arrange (preparar)
        const userId = '5';
        const mockFetch = vi.fn().mockResolvedValue({
            json: async () => ({ success: true })
        });
        global.fetch = mockFetch;

        // Act (actuar)
        await deleteUser(userId);

        // Assert (verificar)
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(`/users/${userId}`),
            { method: 'DELETE' }
        );
    });

    it('debe devolver true cuando la eliminación es exitosa', async () => {
        // Arrange
        const mockFetch = vi.fn().mockResolvedValue({
            json: async () => ({ success: true })
        });
        global.fetch = mockFetch;

        // Act
        const result = await deleteUser('5');

        // Assert
        expect(result).toBe(true);
    });

    it('debe manejar errores cuando la eliminación falla', async () => {
        // Arrange
        const mockFetch = vi.fn().mockRejectedValue(
            new Error('Network error')
        );
        global.fetch = mockFetch;

        // Act & Assert
        expect(deleteUser('5')).rejects.toThrow('Network error');
    });
});
```

---

## Explicación del test

### Estructura: Arrange, Act, Assert (AAA)

```js
it('debe hacer un DELETE request', async () => {
    // ARRANGE (preparar)
    // Configura todo lo que necesitas para el test
    const userId = '5';
    const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({ success: true })
    });
    global.fetch = mockFetch;

    // ACT (actuar)
    // Ejecuta el código que quieres probar
    await deleteUser(userId);

    // ASSERT (verificar)
    // Verifica que el resultado es el esperado
    expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/users/${userId}`),
        { method: 'DELETE' }
    );
});
```

### Qué significa cada parte

```js
describe('deleteUser', () => {
    // describe = agrupa tests relacionados
});

it('debe hacer un DELETE request', async () => {
    // it = un test individual
    // async = porque deleteUser es asincrónico
});

vi.fn() 
    // crea una función "mock" (falsa) que puedes espiar
    // te permite ver si fue llamada, con qué argumentos, etc.

vi.fn().mockResolvedValue({ json: async () => ({ success: true }) })
    // cuando se llama, devuelve una promesa resuelta
    // simula una respuesta exitosa del servidor

expect(mockFetch).toHaveBeenCalledWith(...)
    // verifica que mockFetch fue llamada con estos argumentos
```

---

## Test de integración: deleteUser + reloadPage

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUser } from './delete-user-by-id';
import usersStore from '../store/users-store';

describe('Eliminación de usuario - Integración', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Resetea el store
        usersStore.currentPage = 1;
        usersStore.users = [];
    });

    it('debe eliminar un usuario y actualizar la tabla', async () => {
        // Arrange
        const mockFetch = vi.fn()
            .mockResolvedValueOnce({
                // Primera llamada: DELETE (eliminación)
                json: async () => ({ success: true })
            })
            .mockResolvedValueOnce({
                // Segunda llamada: GET (recargar página)
                json: async () => ({
                    data: [
                        { id: '1', first_name: 'Ryan', last_name: 'Kent' },
                        { id: '2', first_name: 'Francine', last_name: 'Ingram' }
                    ],
                    pages: 1
                })
            });
        global.fetch = mockFetch;

        // Act
        await deleteUser('5');
        await usersStore.reloadPage();

        // Assert
        const users = usersStore.getUsers();
        expect(users).toHaveLength(2);
        expect(users.find(u => u.id === '5')).toBeUndefined();
    });

    it('debe ir a la página anterior si la página actual queda vacía', async () => {
        // Arrange
        const mockFetch = vi.fn()
            .mockResolvedValueOnce({
                // DELETE
                json: async () => ({ success: true })
            })
            .mockResolvedValueOnce({
                // GET página actual (vacía)
                json: async () => ({
                    data: [],
                    pages: 1
                })
            })
            .mockResolvedValueOnce({
                // GET página anterior
                json: async () => ({
                    data: [
                        { id: '1', first_name: 'Ryan', last_name: 'Kent' }
                    ],
                    pages: 1
                })
            });
        global.fetch = mockFetch;

        usersStore.currentPage = 2;

        // Act
        await deleteUser('5');
        await usersStore.reloadPage();

        // Assert
        expect(usersStore.getCurrentPage()).toBe(1);
        expect(usersStore.getUsers()).toHaveLength(1);
    });
});
```

---

## Test de la tabla (renderTable)

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderTable } from './render-table';
import usersStore from '../../store/users-store';

describe('renderTable', () => {

    let container;

    beforeEach(() => {
        // Crea un contenedor para la tabla
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Limpia después de cada test
        document.body.removeChild(container);
    });

    it('debe renderizar una tabla con los usuarios', () => {
        // Arrange
        const mockUsers = [
            { id: '1', firstName: 'Ryan', lastName: 'Kent', balance: 1324, isActive: false },
            { id: '2', firstName: 'Francine', lastName: 'Ingram', balance: 1120, isActive: true }
        ];
        vi.spyOn(usersStore, 'getUsers').mockReturnValue(mockUsers);

        // Act
        renderTable(container);

        // Assert
        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('Ryan');
        expect(rows[1].textContent).toContain('Francine');
    });

    it('debe tener botones de Delete para cada usuario', () => {
        // Arrange
        const mockUsers = [
            { id: '1', firstName: 'Ryan', lastName: 'Kent', balance: 1324, isActive: false }
        ];
        vi.spyOn(usersStore, 'getUsers').mockReturnValue(mockUsers);

        // Act
        renderTable(container);

        // Assert
        const deleteButtons = container.querySelectorAll('.delete-user');
        expect(deleteButtons).toHaveLength(1);
        expect(deleteButtons[0].getAttribute('data-id')).toBe('1');
    });

    it('debe llamar a deleteUser cuando se hace click en Delete', async () => {
        // Arrange
        const mockUsers = [
            { id: '1', firstName: 'Ryan', lastName: 'Kent', balance: 1324, isActive: false }
        ];
        vi.spyOn(usersStore, 'getUsers').mockReturnValue(mockUsers);
        
        const mockDeleteUser = vi.fn().mockResolvedValue(true);
        vi.mock('../../use-cases/delete-user-by-id', () => ({
            deleteUser: mockDeleteUser
        }));

        // Act
        renderTable(container);
        const deleteButton = container.querySelector('.delete-user');
        deleteButton.click();

        // Assert
        expect(mockDeleteUser).toHaveBeenCalledWith('1');
    });
});
```

---

## Conceptos clave

### Mock (Simulación)

Un mock es una función falsa que simula el comportamiento de una función real.

```js
// Función real
const deleteUser = async (id) => {
    const res = await fetch(`/users/${id}`, { method: 'DELETE' });
    return res.json();
};

// Mock
const mockDeleteUser = vi.fn().mockResolvedValue({ success: true });

// Ahora puedes:
mockDeleteUser('5');  // devuelve { success: true }
expect(mockDeleteUser).toHaveBeenCalledWith('5');  // verifica que fue llamada
```

### Spy (Espía)

Un spy es como un mock, pero mantiene el comportamiento original.

```js
// Espía en usersStore.getUsers
vi.spyOn(usersStore, 'getUsers').mockReturnValue([...]);

// Ahora puedes:
usersStore.getUsers();  // devuelve lo que especificaste
expect(usersStore.getUsers).toHaveBeenCalled();  // verifica que fue llamada
```

### Expect (Verificación)

Verifica que algo es verdadero.

```js
expect(result).toBe(true);                    // igualdad estricta
expect(array).toHaveLength(2);                // longitud
expect(array).toContain(item);                // contiene
expect(fn).toHaveBeenCalled();                // fue llamada
expect(fn).toHaveBeenCalledWith(arg);         // fue llamada con este argumento
expect(promise).rejects.toThrow();            // rechaza con error
```

---

## Cómo ejecutar los tests

```bash
# Ejecuta los tests en modo watch (se actualizan automáticamente)
npm run test

# Ejecuta los tests una sola vez
npm run test:run

# Ejecuta solo un archivo
npm run test:run src/users/use-cases/delete-user-by-id.test.js

# Ejecuta tests que coincidan con un patrón
npm run test:run --grep "eliminación"
```

---

## Checklist para escribir buenos tests

✅ **Nombre descriptivo:** `it('debe eliminar un usuario y actualizar la tabla')`
✅ **Estructura AAA:** Arrange, Act, Assert
✅ **Una cosa por test:** Cada test verifica una cosa
✅ **Independientes:** Los tests no dependen uno del otro
✅ **Rápidos:** Los tests deben ser rápidos
✅ **Determinísticos:** Siempre dan el mismo resultado
✅ **Mocks cuando sea necesario:** No hagas requests reales
✅ **Limpieza:** Limpia después de cada test

---

## Errores comunes

### ❌ Test demasiado genérico

```js
it('funciona', () => {
    expect(deleteUser('5')).toBe(true);
});
```

### ✅ Test descriptivo

```js
it('debe hacer un DELETE request y devolver true', async () => {
    const result = await deleteUser('5');
    expect(result).toBe(true);
});
```

---

### ❌ Test que depende de otros

```js
it('test 1', () => { /* ... */ });
it('test 2', () => {
    // Depende del resultado de test 1
});
```

### ✅ Tests independientes

```js
beforeEach(() => {
    // Resetea el estado antes de cada test
    vi.clearAllMocks();
});

it('test 1', () => { /* ... */ });
it('test 2', () => { /* ... */ });
```

---

## Resumen

| Concepto | Qué es |
|---|---|
| **Test** | Código que verifica que tu código funciona |
| **Unit test** | Prueba una función individual |
| **Integration test** | Prueba varias funciones juntas |
| **Mock** | Función falsa que simula comportamiento |
| **Spy** | Mock que mantiene el comportamiento original |
| **Expect** | Verifica que algo es verdadero |
| **AAA** | Arrange (preparar), Act (actuar), Assert (verificar) |

---

## Próximos pasos

1. Instala Vitest: `npm install -D vitest`
2. Crea `src/users/use-cases/delete-user-by-id.test.js`
3. Copia el test básico que mostré
4. Ejecuta: `npm run test:run`
5. Verifica que pase ✅

¡Felicidades, acabas de escribir tu primer test!
