# Bug de currentPage — Análisis y solución

## El problema

Cuando eliminas el último usuario de una página:

```
Página 5 tiene: [usuario1]

Eliminas usuario1
  ↓
reloadPage() se ejecuta
  ↓
Navega a página 4 ✅
  ↓
Pero el span #current-page sigue mostrando "5" ❌
```

---

## ¿Por qué pasa?

Vamos a rastrear el flujo paso a paso.

### Paso 1: Haces click en Delete

```js
const tableDeleteListener = async (event) => {
    const element = event.target.closest('.delete-user');
    const id = element.getAttribute('data-id');
    
    try {
        await deleteUser(id);  // Elimina del servidor
        await usersStore.reloadPage();  // Recarga la página
        document.querySelector('#current-page').innerText = usersStore.getCurrentPage();  // ← AQUÍ
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
    // Pide página 5 (la actual)
    // El servidor devuelve [] (vacía, porque eliminaste el único usuario)
    
    if(users.length === 0) {
        await loadPreviousPage();  // ← VA A PÁGINA 4
        return;  // ← AQUÍ SALE
    }
    
    state.users = users;
}
```

### Paso 3: loadPreviousPage() se ejecuta

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const users = await loadUsersByPage(state.currentPage - 1);
    // Pide página 4
    // El servidor devuelve [usuario1, usuario2, ..., usuario10]
    
    state.users = users;
    state.currentPage -= 1;  // ← ACTUALIZA A 4
}
```

### Paso 4: Vuelve a tableDeleteListener

```js
const tableDeleteListener = async (event) => {
    // ...
    await usersStore.reloadPage();  // ← AQUÍ TERMINA
    
    // En este punto:
    // state.currentPage = 4 ✅
    // state.users = [usuarios de página 4] ✅
    
    document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
    // Esto debería actualizar el span a "4"
    
    renderTable();
};
```

---

## Entonces, ¿por qué no funciona?

**Hay un problema de timing (orden de ejecución).**

Mira el flujo real:

```
reloadPage() se ejecuta
  ↓
if(users.length === 0) → true
  ↓
await loadPreviousPage()  ← ESPERA A QUE TERMINE
  ↓
return  ← SALE DE reloadPage
  ↓
Vuelve a tableDeleteListener
  ↓
document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
  ↓
renderTable();
```

**Espera, eso debería funcionar...**

---

## El verdadero problema

Déjame revisar `loadPreviousPage` más cuidadosamente:

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const users = await loadUsersByPage(state.currentPage - 1);
    // ← AQUÍ ESTÁ EL PROBLEMA
    
    state.users = users;
    state.currentPage -= 1;
}
```

**Espera, `loadUsersByPage` devuelve qué?**

Déjame revisar:

```js
export const loadUsersByPage = async (page = 1) => {
    const url = `${import.meta.env.VITE_BASE_URL}/users?_page=${page}`;
    const res = await fetch(url);
    const data = await res.json();
    
    const { first, pages } = data;
    const users = data.data.map(localhostUserToModel);
    
    return { users, first, pages };
}
```

**Ahí está el problema:**

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const users = await loadUsersByPage(state.currentPage - 1);
    // ← users es un OBJETO { users: [...], first: 1, pages: 6 }
    // NO es un array
    
    state.users = users;  // ← ASIGNA EL OBJETO COMPLETO
    state.currentPage -= 1;
}
```

**¡Ese es el bug!**

En `loadPreviousPage`, estás destructurando mal:

```js
const users = await loadUsersByPage(state.currentPage - 1);
// users = { users: [...], first: 1, pages: 6 }

state.users = users;  // ← Asignas el objeto completo, no el array
```

Debería ser:

```js
const { users } = await loadUsersByPage(state.currentPage - 1);
// users = [...]

state.users = users;  // ← Asignas el array
```

---

## Verificación

Mira `loadNextPage`:

```js
const loadNextPage = async() => {
    const { pages, users } = await loadUsersByPage(state.currentPage + 1);
    // ← DESTRUCTURING CORRECTO
    
    if(users.length === 0) return;
    if(state.currentPage === pages) return;
    
    state.currentPage += 1;
    state.users = users;
}
```

Mira `loadPreviousPage`:

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const users = await loadUsersByPage(state.currentPage - 1);
    // ← SIN DESTRUCTURING, ASIGNA EL OBJETO COMPLETO
    
    state.users = users;  // ← BUG
    state.currentPage -= 1;
}
```

**¡Inconsistencia!**

---

## El flujo real con el bug

```
Página 5 tiene: [usuario1]

Eliminas usuario1
  ↓
reloadPage()
  ↓
loadUsersByPage(5) devuelve { users: [], first: 1, pages: 6 }
  ↓
if(users.length === 0) → true
  ↓
loadPreviousPage()
  ↓
const users = await loadUsersByPage(4);
// users = { users: [usuario1, ..., usuario10], first: 1, pages: 6 }
  ↓
state.users = users;
// state.users = { users: [...], first: 1, pages: 6 }  ← OBJETO, NO ARRAY
  ↓
state.currentPage -= 1;  // state.currentPage = 4
  ↓
Vuelve a tableDeleteListener
  ↓
document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
// Muestra "4" ✅
  ↓
renderTable()
  ↓
const users = usersStore.getUsers();
// users = { users: [...], first: 1, pages: 6 }  ← OBJETO
  ↓
users.forEach(user => { ... })
// Intenta iterar sobre un objeto
// No funciona correctamente
```

---

## La solución

Arregla `loadPreviousPage` para que destructure correctamente:

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const { users } = await loadUsersByPage(state.currentPage - 1);  // ← DESTRUCTURING
    
    state.users = users;
    state.currentPage -= 1;
}
```

---

## Verificación completa

Después de arreglarlo, el flujo será:

```
Página 5 tiene: [usuario1]

Eliminas usuario1
  ↓
reloadPage()
  ↓
loadUsersByPage(5) devuelve { users: [], first: 1, pages: 6 }
  ↓
if(users.length === 0) → true
  ↓
loadPreviousPage()
  ↓
const { users } = await loadUsersByPage(4);
// users = [usuario1, ..., usuario10]  ← ARRAY
  ↓
state.users = users;
// state.users = [usuario1, ..., usuario10]  ← ARRAY
  ↓
state.currentPage -= 1;  // state.currentPage = 4
  ↓
Vuelve a tableDeleteListener
  ↓
document.querySelector('#current-page').innerText = usersStore.getCurrentPage();
// Muestra "4" ✅
  ↓
renderTable()
  ↓
const users = usersStore.getUsers();
// users = [usuario1, ..., usuario10]  ← ARRAY
  ↓
users.forEach(user => { ... })
// Funciona correctamente ✅
```

---

## Resumen

| Problema | Causa | Solución |
|---|---|---|
| currentPage no se actualiza | `loadPreviousPage` no destructura | Agregar `{ users }` |
| Tabla no se renderiza bien | `state.users` es un objeto, no un array | Destructuring correcto |
| Inconsistencia | `loadNextPage` destructura, `loadPreviousPage` no | Hacer ambas iguales |

---

## El código correcto

```js
const loadPreviousPage = async() => {
    if(state.currentPage === 1) return;
    
    const { users } = await loadUsersByPage(state.currentPage - 1);  // ✅ CAMBIO
    
    state.users = users;
    state.currentPage -= 1;
}
```

Eso es todo. Una línea de cambio.

---

## Lección

**Siempre sé consistente con la destructuring:**

```js
// ✅ CONSISTENTE
const { users } = await loadUsersByPage(page);
const { users } = await loadUsersByPage(page);

// ❌ INCONSISTENTE
const { users } = await loadUsersByPage(page);
const users = await loadUsersByPage(page);
```

Cuando una función devuelve un objeto, siempre destructura de la misma forma.
