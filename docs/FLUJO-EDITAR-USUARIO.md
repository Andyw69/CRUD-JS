# Flujo de editar usuario — Explicación detallada

## El viaje de un usuario desde la tabla hasta el modal lleno de datos

Cuando haces click en "Select" en la tabla, ¿qué pasa? Vamos a rastrearlo paso a paso.

---

## Analogía: El viaje de un paquete

Imagina que quieres editar un usuario. Es como un paquete que viaja por diferentes estaciones:

```
Tabla (usuario en la tabla)
    ↓
Click en "Select" (abre el paquete)
    ↓
Obtiene el ID (dirección del paquete)
    ↓
Busca en el servidor (va al almacén)
    ↓
Trae los datos completos (abre el paquete)
    ↓
Traduce el formato (cambia el idioma del paquete)
    ↓
Llena el formulario (coloca el paquete en la caja)
    ↓
Modal se abre (muestra la caja)
```

---

## Paso 1: Usuario hace click en "Select" en la tabla

En `render-table.js`:

```html
<a href="#/" class="select-user" data-id="${user.id}">Select</a>
```

Cada fila tiene un botón "Select" con el `data-id` del usuario. Cuando haces click:

```js
const tableSelectListener = (event) => {
    const element = event.target.closest('.select-user');
    if(!element) return;

    const id = element.getAttribute('data-id');  // ← obtiene el ID
    showModal(id);  // ← pasa el ID al modal
};

table.addEventListener('click', tableSelectListener);
```

**Resultado:** Tienes el ID del usuario que quieres editar.

---

## Paso 2: showModal recibe el ID

En `render-modal.js`:

```js
export const showModal = async( id ) => {
    modal?.classList.remove('hide-modal');  // muestra el modal
    loadedUser = {};  // limpia el usuario anterior

    if( !id ) return;  // si no hay ID, es un usuario nuevo

    const user = await getUserById(id);  // ← BUSCA EL USUARIO EN EL SERVIDOR
    setFormValues(user);  // ← LLENA EL FORMULARIO
}
```

Aquí ocurren dos cosas importantes:
1. Si hay ID → busca el usuario en el servidor
2. Si no hay ID → es un usuario nuevo, abre el modal vacío

---

## Paso 3: getUserById busca en el servidor

En `get-user-by-id.js`:

```js
export const getUserById = async (id) => {
    const url = `${import.meta.env.VITE_BASE_URL}/users/${id}`;
    // url = "http://localhost:3000/users/5"
    
    const res = await fetch(url);
    const data = await res.json();
    
    // El servidor devuelve:
    // {
    //   "id": "5",
    //   "first_name": "Mia",      ← snake_case
    //   "last_name": "Wade",      ← snake_case
    //   "balance": 1455.08,
    //   "isActive": false,
    //   "avatar": "http://...",
    //   "gender": "female"
    // }
    
    const user = localhostUserToModel(data);  // ← TRADUCE EL FORMATO
    return user;
}
```

**Aquí es donde entra el mapper.** El servidor devuelve `first_name` y `last_name`, pero tu app usa `firstName` y `lastName`.

---

## Paso 4: El mapper traduce el formato

En `localhost-user.mapper.js`:

```js
export const localhostUserToModel = (localhostUser) => {
    const {
        avatar,
        balance,
        first_name,    // ← del servidor (snake_case)
        gender,
        id,
        isActive,
        last_name      // ← del servidor (snake_case)
    } = localhostUser;
    
    return new User({
        avatar,
        balance,
        firstName: first_name,   // ← TRADUCE: first_name → firstName
        gender,
        id,
        isActive,
        lastName: last_name      // ← TRADUCE: last_name → lastName
    });
}
```

**Resultado:** Un objeto User limpio con `firstName` y `lastName`.

---

## Paso 5: setFormValues llena el formulario

De vuelta en `render-modal.js`:

```js
const setFormValues = (user) => {
    // user es:
    // User {
    //   id: "5",
    //   firstName: "Mia",
    //   lastName: "Wade",
    //   balance: 1455.08,
    //   isActive: false,
    //   avatar: "http://...",
    //   gender: "female"
    // }

    form.querySelector('[name="firstName"]').value = user.firstName;
    // <input name="firstName" value="Mia">
    
    form.querySelector('[name="lastName"]').value = user.lastName;
    // <input name="lastName" value="Wade">
    
    form.querySelector('[name="balance"]').value = user.balance;
    // <input name="balance" value="1455.08">
    
    form.querySelector('[name="isActive"]').value = user.isActive;
    // <input name="isActive" value="false">
    
    loadedUser = user;  // ← GUARDA EL USUARIO ORIGINAL
}
```

**Resultado:** El formulario está lleno con los datos del usuario.

---

## Paso 6: Usuario edita y hace submit

El usuario cambia algunos valores en el formulario:

```
firstName: "Mia" → "Maria"
lastName: "Wade" → "Wade" (sin cambios)
balance: 1455.08 → 2000
```

Cuando hace submit:

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    
    // Aquí está la magia:
    const userLike = {...loadedUser};  // ← COPIA EL USUARIO ORIGINAL
    
    // Luego sobrescribe con los valores del formulario
    for(const [key, value] of formData){
        if(key === 'balance'){                
            userLike[key] = +value;  // convierte a número
            continue;
        }
        if(key === 'isActive'){
            userLike[key] = (value === 'on') ? true : false;
            continue;
        }
        userLike[key] = value;
    }
    
    // userLike ahora es:
    // {
    //   id: "5",              ← MANTIENE EL ID ORIGINAL
    //   firstName: "Maria",   ← CAMBIÓ
    //   lastName: "Wade",
    //   balance: 2000,        ← CAMBIÓ
    //   isActive: false,
    //   avatar: "http://...",
    //   gender: "female"
    // }
    
    await saveUserCallback(userLike);
    hideModal();
});
```

**Punto clave:** `const userLike = {...loadedUser}` copia el usuario original, incluyendo el `id`. Luego sobrescribe solo los campos que el usuario editó.

---

## Paso 7: saveUser detecta que es actualización

En `save-user.js`:

```js
export const saveUser = async(userLike) => {
    
    const user = new User(userLike);
    
    // user tiene:
    // {
    //   id: "5",              ← TIENE ID
    //   firstName: "Maria",
    //   ...
    // }
    
    if(user.id) {
        throw 'No implementada la actualizacion';  // ← AQUÍ ENTRA
        return;
    }
    
    // Si llegara aquí, sería creación
    const updatedUser = await createUser(userLocalhost);
    return updatedUser;
}
```

**Aquí es donde la lógica se divide:**
- Si `user.id` existe → es una actualización (pero no está implementada)
- Si `user.id` es undefined → es creación

---

## El flujo completo visual

```
Usuario hace click en "Select" en la tabla
    ↓
tableSelectListener obtiene el ID
    ↓
showModal(id) se ejecuta
    ↓
getUserById(id) busca en el servidor
    ├─ fetch GET /users/5
    └─ servidor devuelve { first_name, last_name, ... }
    ↓
localhostUserToModel traduce
    ├─ first_name → firstName
    └─ last_name → lastName
    ↓
setFormValues llena el formulario
    ├─ firstName input.value = "Mia"
    ├─ lastName input.value = "Wade"
    ├─ balance input.value = "1455.08"
    └─ loadedUser = user (guarda el original)
    ↓
Modal se abre con los datos
    ↓
Usuario edita los campos
    ↓
Usuario hace submit
    ↓
userLike = {...loadedUser} (copia con ID)
    ↓
Sobrescribe con valores del formulario
    ↓
saveUserCallback(userLike)
    ↓
saveUser detecta que tiene ID
    ↓
Lanza error "No implementada la actualizacion"
```

---

## Los puntos clave

| Concepto | Qué es | Por qué |
|---|---|---|
| **loadedUser** | Variable que guarda el usuario original | Para mantener el ID cuando editas |
| **{...loadedUser}** | Copia del usuario original | Para no perder el ID y otros datos |
| **mapper** | Traduce first_name → firstName | El servidor y tu app hablan idiomas diferentes |
| **if(user.id)** | Valida si es creación o actualización | Si tiene ID, es edición; si no, es nuevo |
| **setFormValues** | Llena el formulario con datos del servidor | Para que veas qué estás editando |

---

## ¿Por qué {...loadedUser}?

Cuando haces `const userLike = {...loadedUser}`, estás haciendo una **copia superficial** del objeto.

```js
// Antes
loadedUser = {
    id: "5",
    firstName: "Mia",
    lastName: "Wade",
    balance: 1455.08
}

// Después de {...loadedUser}
userLike = {
    id: "5",
    firstName: "Mia",
    lastName: "Wade",
    balance: 1455.08
}

// Son dos objetos diferentes, pero con los mismos datos
// Si cambias userLike, loadedUser no cambia
```

Luego sobrescribes solo los campos que el usuario editó:

```js
userLike.firstName = "Maria";  // cambió
userLike.balance = 2000;       // cambió
// userLike.lastName sigue siendo "Wade" (no cambió)
// userLike.id sigue siendo "5" (nunca cambió)
```

---

## Resumen en una frase

El flujo es: **Click → Obtén ID → Busca en servidor → Traduce formato → Llena formulario → Usuario edita → Copia original + cambios → Detecta que tiene ID → Sabe que es actualización**.
