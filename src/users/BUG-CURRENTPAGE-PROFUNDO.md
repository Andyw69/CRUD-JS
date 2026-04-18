# Bug de currentPage — Análisis profundo del verdadero problema

## Tu escenario exacto

```
30 usuarios totales
Página 4: [31]  (solo 1 usuario, el que creaste)

Estás en página 4
state.currentPage = 4

Eliminas usuario 31
```

## El flujo paso a paso

### Paso 1: tableDeleteListener se ejecuta

```js
const tableDeleteListener = async (event) => {
    const element = event.target.closest('.delete-user');
    const id = element.getAttribute('data-id');
    
    try {
        await deleteUser(id);  // Elimina del servidor
        await usersStore.reloadPage();  // ← AQUÍ
        document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
        renderTable();
    } catch (error) {
        console.log(error);
        alert('Error, no se pudo eliminar')
    }
};
```

### Paso 2: reloadPage() se ejecuta

```js
const reloadPage = async() => {
    const { users } = await loadUsersByPage(state.currentPage);
    // Pide página 4
    // El servidor devuelve { users: [], first: 1, pages: 3 }
    // (ahora hay 30 usuarios, no 31, así que solo hay 3 páginas)
    
    if(users.length === 0) {
        await loadPreviousPage();  // ← VA A PÁGINA 3
        return;
    }
    
    state.users = users;
}
```

### Paso 3: loadPreviousPage() se ejecuta

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const { users } = await loadUsersByPage(state.currentPage - 1);
    // Pide página 3 (4 - 1)
    // El servidor devuelve [usuario21, ..., usuario30]
    
    state.users = users;
    state.currentPage -= 1;  // state.currentPage = 3
}
```

### Paso 4: Vuelve a tableDeleteListener

```js
const tableDeleteListener = async (event) => {
    // ...
    await usersStore.reloadPage();  // ← TERMINA AQUÍ
    
    // En este punto:
    // state.currentPage = 3 ✅
    // state.users = [usuario21, ..., usuario30] ✅
    
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
    // Debería mostrar "3"
    
    renderTable();
};
```

---

## Entonces, ¿por qué sigue mostrando "4"?

**Hay un problema de timing (orden de ejecución).**

Mira esto:

```js
await usersStore.reloadPage();
document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
```

Espera... eso debería funcionar.

**A menos que...**

---

## El verdadero problema: onUserChanged

Cuando creas un usuario, ¿qué pasa?

```js
renderModal(element, async(userLike) => {
    const user = await saveUser(userLike);
    usersStore.onUserChanged(user);  // ← AQUÍ
    renderTable();
});
```

`onUserChanged` hace esto:

```js
const onUserChanged = async(updatedUser) => {
    let wasFound = false;
    state.users = state.users.map(user => {
        if(user.id === updatedUser.id) {
            wasFound = true;
            return updatedUser;
        }
        return user;
    });
    
    if(state.users.length < 10 && !wasFound) {
        state.users.push(updatedUser);  // ← AGREGA EL USUARIO
    }
}
```

**Cuando creas el usuario 31:**

```
Estás en página 3: [usuario21, ..., usuario30]
state.users.length = 10

Creas usuario 31
  ↓
saveUser devuelve usuario 31
  ↓
onUserChanged(usuario 31)
  ↓
map() busca usuario 31 en state.users
  → NO LO ENCUENTRA
  → wasFound = false
  ↓
if(10 < 10 && true)
if(false && true)
if(false)  ← NO ENTRA
  ↓
Usuario 31 NO se agrega a state.users
```

**Espera, eso es correcto. No debería agregarse porque la página está completa.**

---

## Déjame pensar diferente

Tu problema es:

> "Si me cambio a la página anterior pero el número de la página actual en la que estoy no cambia"

**¿Cómo te cambias a la página anterior?**

¿Presionas el botón "Previous"? ¿O algo más?

Si presionas el botón "Previous", ¿qué pasa?

```js
// En render-buttons.js (probablemente)
const previousButton = document.querySelector('.previous-button');
previousButton.addEventListener('click', async () => {
    await usersStore.loadPreviousPage();
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
    renderTable();
});
```

**Pero espera, tú dices:**

> "Si me cambio a la página anterior pero el número de la página actual en la que estoy no cambia, se mantiene en 4 si presiono el boton de previous ya cambia pero tengo que presionar 2 veces para que vaya a la pagina 2"

**Eso significa:**

1. Estás en página 4
2. Presionas Previous
3. El span sigue mostrando "4"
4. Presionas Previous de nuevo
5. Ahora muestra "2"

**¿Eso significa que saltó de página 4 a página 2?**

---

## El verdadero problema: Inconsistencia en la actualización del span

Mira `tableDeleteListener`:

```js
const tableDeleteListener = async (event) => {
    // ...
    await usersStore.reloadPage();
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
    renderTable();
};
```

Pero en `render-buttons.js` (que probablemente existe), ¿también actualizas el span?

```js
// Probablemente en render-buttons.js
previousButton.addEventListener('click', async () => {
    await usersStore.loadPreviousPage();
    // ¿Actualizas el span aquí?
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
    renderTable();
});
```

**Si no actualizas el span en render-buttons, ese es el problema.**

---

## Análisis del flujo real

### Escenario: Estás en página 4, presionas Previous

```
state.currentPage = 4

Presionas Previous
  ↓
loadPreviousPage()
  ↓
state.currentPage = 3
  ↓
¿Se actualiza el span?
  ↓
Si NO se actualiza → span sigue mostrando "4" ❌
Si SÍ se actualiza → span muestra "3" ✅
```

### Escenario: Presionas Previous de nuevo

```
state.currentPage = 3

Presionas Previous
  ↓
loadPreviousPage()
  ↓
state.currentPage = 2
  ↓
¿Se actualiza el span?
  ↓
Si NO se actualiza → span sigue mostrando "3" ❌
Si SÍ se actualiza → span muestra "2" ✅
```

---

## La solución

El problema es que **no actualizas el span en todos los lugares donde cambias de página.**

Tienes que actualizar el span en:

1. ✅ `tableDeleteListener` (ya lo haces)
2. ❌ `render-buttons.js` (probablemente no lo haces)

---

## Código que probablemente necesitas

En `render-buttons.js`:

```js
const previousButton = document.querySelector('.previous-button');
previousButton.addEventListener('click', async () => {
    await usersStore.loadPreviousPage();
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();  // ← AGREGAR
    renderTable();
});

const nextButton = document.querySelector('.next-button');
nextButton.addEventListener('click', async () => {
    await usersStore.loadNextPage();
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();  // ← AGREGAR
    renderTable();
});
```

---

## La mejor solución: Centralizar la actualización

En lugar de actualizar el span en múltiples lugares, crea una función:

```js
// En render-buttons.js o en un archivo separado
const updatePageDisplay = () => {
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
};

// Luego úsala en todos los lugares
previousButton.addEventListener('click', async () => {
    await usersStore.loadPreviousPage();
    updatePageDisplay();  // ← CENTRALIZADO
    renderTable();
});

nextButton.addEventListener('click', async () => {
    await usersStore.loadNextPage();
    updatePageDisplay();  // ← CENTRALIZADO
    renderTable();
});

// En tableDeleteListener
const tableDeleteListener = async (event) => {
    // ...
    await usersStore.reloadPage();
    updatePageDisplay();  // ← CENTRALIZADO
    renderTable();
};
```

---

## Resumen

| Problema | Causa | Solución |
|---|---|---|
| Span no se actualiza | No actualizas en todos los lugares | Actualizar en render-buttons.js |
| Tienes que presionar 2 veces | Inconsistencia en la actualización | Centralizar la actualización |
| currentPage cambia pero el span no | Falta actualizar el span | Agregar `document.querySelector('#current-page').innerText = ...` |

---

## Checklist

- [ ] ¿Actualizas el span en `tableDeleteListener`? ✅
- [ ] ¿Actualizas el span en el botón Previous? ❌
- [ ] ¿Actualizas el span en el botón Next? ❌
- [ ] ¿Actualizas el span en otros lugares donde cambias de página? ❌

Revisa `render-buttons.js` y asegúrate de actualizar el span en todos los listeners.
