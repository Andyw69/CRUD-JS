# Flujo completo de actualizar usuario — Explicación profunda

## El viaje de un usuario desde la edición hasta la base de datos

Cuando editas un usuario y haces submit, ¿qué pasa? Vamos a rastrearlo paso a paso, entendiendo el **por qué**, el **cómo**, el **para qué**, y qué se puede mejorar.

---

## Analogía: El viaje de un paquete en una tienda

Imagina que tienes un paquete en una tienda:

```
Paquete original (usuario en la BD)
    ↓
Lo sacas del estante (lo cargas en el modal)
    ↓
Lo editas (cambias algunos datos)
    ↓
Lo llevas a caja (haces submit)
    ↓
La caja lo procesa (saveUser lo valida)
    ↓
Decide si es nuevo o actualización (if(user.id))
    ↓
Lo envía al almacén (fetch PATCH)
    ↓
El almacén lo actualiza (json-server guarda)
    ↓
Te devuelve el paquete actualizado
    ↓
Lo colocas de vuelta en el estante (actualiza la tabla)
```

---

## Paso 1: Usuario hace click en "Select" y edita

En `render-table.js`:

```js
<a href="#/" class="select-user" data-id="${user.id}">Select</a>
```

Cuando haces click, se abre el modal con los datos del usuario (ya explicado antes).

El usuario edita algunos campos:

```
firstName: "Mia" → "Maria"
balance: 1455.08 → 2000
```

---

## Paso 2: Usuario hace submit en el formulario

En `render-modal.js`:

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    
    // Aquí ocurre la magia
    const userLike = {...loadedUser};  // ← COPIA EL USUARIO ORIGINAL (CON ID)
    
    for(const [key, value] of formData) {
        if(key === 'balance') {
            userLike[key] = +value;  // convierte a número
            continue;
        }
        if(key === 'isActive') {
            userLike[key] = (value === 'on') ? true : false;  // convierte a booleano
            continue;
        }
        userLike[key] = value;
    }
    
    // userLike es:
    // {
    //   id: "5",              ← MANTIENE EL ID
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

**Por qué:** `{...loadedUser}` copia el usuario original. Luego sobrescribes solo los campos que el usuario editó. El ID se mantiene.

**Para qué:** El ID es crucial. Sin él, no sabrías si es creación o actualización.

---

## Paso 3: saveUserCallback ejecuta saveUser

En `users-app.js`:

```js
renderModal(element, async(userLike) => {
    const user = await saveUser(userLike);  // ← AQUÍ ENTRA
    usersStore.onUserChanged(user);
    renderTable();
});
```

El callback que pasaste a `renderModal` es una función que llama a `saveUser`.

---

## Paso 4: saveUser valida y decide qué hacer

En `save-user.js`:

```js
export const saveUser = async(userLike) => {
    
    // Paso 4a: Convierte a instancia de User
    const user = new User(userLike);
    
    // user es:
    // User {
    //   id: "5",
    //   firstName: "Maria",
    //   lastName: "Wade",
    //   balance: 2000,
    //   isActive: false,
    //   avatar: "http://...",
    //   gender: "female"
    // }
    
    // Paso 4b: Valida que tenga nombre
    if(!user.firstName || !user.lastName) {
        throw 'First and last name are required';
    }
    
    // Paso 4c: Traduce a formato del servidor (snake_case)
    const userToSave = userModelToLocalhost(user);
    
    // userToSave es:
    // {
    //   id: "5",
    //   first_name: "Maria",   ← TRADUCIDO
    //   last_name: "Wade",     ← TRADUCIDO
    //   balance: 2000,
    //   isActive: false,
    //   avatar: "http://...",
    //   gender: "female"
    // }
    
    let userUpdated;
    
    // Paso 4d: AQUÍ ESTÁ LA DECISIÓN CLAVE
    if(user.id) {
        // ← TIENE ID = ES ACTUALIZACIÓN
        userUpdated = await updateUser(userToSave);
    } else {
        // ← NO TIENE ID = ES CREACIÓN
        userUpdated = await createUser(userToSave);
    }
    
    // Paso 4e: Traduce de vuelta a formato de la app (camelCase)
    return localhostUserToModel(userUpdated);
};
```

**Por qué el if(user.id):**
- Si tiene ID → es un usuario existente → actualizar
- Si no tiene ID → es un usuario nuevo → crear

**Por qué los mappers:**
- El servidor habla `snake_case` (first_name, last_name)
- Tu app habla `camelCase` (firstName, lastName)
- Los mappers traducen entre idiomas

---

## Paso 5a: updateUser envía PATCH al servidor

En `save-user.js`:

```js
const updateUser = async(user) => {
    
    // Construye la URL con el ID
    const url = `${import.meta.env.VITE_BASE_URL}/users/${user.id}`;
    // url = "http://localhost:3000/users/5"
    
    // Envía un PATCH (actualización parcial)
    const res = await fetch(url, {
        method: 'PATCH',  // ← PATCH, no POST
        body: JSON.stringify(user),
        headers: {
            'Content-Type': 'application/json',
        }
    });
    
    const updatedUser = await res.json();
    // El servidor devuelve:
    // {
    //   "id": "5",
    //   "first_name": "Maria",
    //   "last_name": "Wade",
    //   "balance": 2000,
    //   "isActive": false,
    //   "avatar": "http://...",
    //   "gender": "female"
    // }
    
    return updatedUser;
}
```

**Por qué PATCH y no PUT:**
- **PATCH** = actualización parcial (solo cambias lo que quieres)
- **PUT** = reemplaza todo (tienes que enviar todos los campos)

PATCH es más eficiente porque solo envías lo que cambió.

---

## Paso 5b: createUser envía POST al servidor

En `save-user.js`:

```js
const createUser = async(user) => {
    
    const url = `${import.meta.env.VITE_BASE_URL}/users`;
    // url = "http://localhost:3000/users"
    
    // Envía un POST (creación)
    const res = await fetch(url, {
        method: 'POST',  // ← POST, no PATCH
        body: JSON.stringify(user),
        headers: {
            'Content-Type': 'application/json',
        }
    });
    
    const newUser = await res.json();
    return newUser;
}
```

**Diferencia:**
- **POST** a `/users` → crea nuevo
- **PATCH** a `/users/5` → actualiza el usuario con ID 5

---

## Paso 6: Vuelve a saveUser

En `save-user.js`:

```js
let userUpdated;

if(user.id) {
    userUpdated = await updateUser(userToSave);  // ← devuelve usuario actualizado
} else {
    userUpdated = await createUser(userToSave);  // ← devuelve usuario nuevo
}

// userUpdated es:
// {
//   "id": "5",
//   "first_name": "Maria",
//   "last_name": "Wade",
//   "balance": 2000,
//   "isActive": false,
//   "avatar": "http://...",
//   "gender": "female"
// }

// Traduce de vuelta a camelCase
return localhostUserToModel(userUpdated);

// Devuelve:
// User {
//   id: "5",
//   firstName: "Maria",
//   lastName: "Wade",
//   balance: 2000,
//   isActive: false,
//   avatar: "http://...",
//   gender: "female"
// }
```

---

## Paso 7: Vuelve a users-app.js

En `users-app.js`:

```js
renderModal(element, async(userLike) => {
    const user = await saveUser(userLike);  // ← recibe el usuario actualizado
    
    // user es:
    // User {
    //   id: "5",
    //   firstName: "Maria",
    //   lastName: "Wade",
    //   balance: 2000,
    //   isActive: false,
    //   avatar: "http://...",
    //   gender: "female"
    // }
    
    usersStore.onUserChanged(user);  // ← ACTUALIZA EL STORE
    renderTable();  // ← REDIBUJA LA TABLA
});
```

---

## Paso 8: onUserChanged actualiza el store

En `users-store.js`:

```js
const onUserChanged = async(updatedUser) => {
    let wasFound = false;
    
    // Busca el usuario en la lista y lo reemplaza
    state.users = state.users.map(user => {
        if(user.id === updatedUser.id) {
            wasFound = true;
            return updatedUser;  // ← REEMPLAZA CON EL ACTUALIZADO
        }
        return user;  // ← MANTIENE LOS DEMÁS
    });
    
    // Si no lo encontró y hay espacio, lo agrega
    if(state.users.length < 10 && !wasFound) {
        state.users.push(updatedUser);
    }
}
```

**Por qué map:**
- Busca el usuario con el mismo ID
- Lo reemplaza con la versión actualizada
- Mantiene los demás usuarios igual

**Por qué el if(!wasFound):**
- Si editas un usuario que no está en la página actual, lo agrega
- Ejemplo: editas usuario de página 2 mientras ves página 1

---

## Paso 9: renderTable redibuja la tabla

En `render-table.js`:

```js
export const renderTable = (element) => {
    const users = usersStore.getUsers();  // ← obtiene usuarios actualizados
    
    // Redibuja la tabla con los nuevos datos
    let tableHTML = '';
    users.forEach(user => {
        tableHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.balance}</td>
                <td>${user.firstName}</td>  ← MUESTRA "Maria"
                <td>${user.lastName}</td>
                <td>${user.isActive}</td>
                <td>
                    <a href="#/" class="select-user" data-id="${user.id}">Select</a>
                </td>
            </tr>
        `;
    });
    
    table.querySelector('tbody').innerHTML = tableHTML;
}
```

**Resultado:** La tabla se redibuja con los datos actualizados.

---

## El flujo completo visual

```
Usuario hace click en "Select"
    ↓
Modal se abre con los datos
    ↓
Usuario edita (firstName: "Mia" → "Maria")
    ↓
Usuario hace submit
    ↓
render-modal extrae datos y copia loadedUser
    ├─ {...loadedUser} mantiene el ID
    └─ sobrescribe con valores editados
    ↓
saveUserCallback(userLike) se ejecuta
    ↓
saveUser(userLike)
    ├─ new User(userLike)
    ├─ valida firstName y lastName
    ├─ userModelToLocalhost traduce a snake_case
    ├─ if(user.id) → true
    └─ updateUser(userToSave)
        ├─ fetch PATCH /users/5
        ├─ json-server actualiza en db.json
        └─ devuelve usuario actualizado
    ↓
localhostUserToModel traduce de vuelta a camelCase
    ↓
usersStore.onUserChanged(user)
    ├─ busca usuario con mismo ID
    ├─ lo reemplaza en state.users
    └─ si no lo encontró, lo agrega
    ↓
renderTable()
    ├─ obtiene usuarios del store
    └─ redibuja la tabla
    ↓
Modal se cierra
    ↓
Tabla muestra "Maria" en lugar de "Mia"
```

---

## Cosas que podrías mejorar

### 1. Separar la lógica de conversión de tipos

**Actual (en render-modal.js):**
```js
for(const [key, value] of formData) {
    if(key === 'balance') {
        userLike[key] = +value;
        continue;
    }
    if(key === 'isActive') {
        userLike[key] = (value === 'on') ? true : false;
        continue;
    }
    userLike[key] = value;
}
```

**Mejor (crear una función):**
```js
const convertFormDataToUser = (formData, baseUser) => {
    const userLike = {...baseUser};
    
    for(const [key, value] of formData) {
        userLike[key] = convertValue(key, value);
    }
    
    return userLike;
};

const convertValue = (key, value) => {
    if(key === 'balance') return +value;
    if(key === 'isActive') return value === 'on';
    return value;
};
```

**Por qué:** Más limpio, reutilizable, fácil de testear.

---

### 2. Usar un mapper para convertir FormData a User

**Actual:**
```js
const userLike = {...loadedUser};
for(const [key, value] of formData) {
    // conversiones manuales
}
```

**Mejor:**
```js
const formDataToUserModel = (formData, baseUser) => {
    const user = Object.fromEntries(formData);
    
    return new User({
        ...baseUser,
        ...user,
        balance: +user.balance,
        isActive: user.isActive === 'on'
    });
};
```

**Por qué:** Usa la clase User para validar, más consistente.

---

### 3. Manejar errores

**Actual:**
```js
if(!user.firstName || !user.lastName) {
    throw 'First and last name are required';
}
```

**Mejor:**
```js
const validateUser = (user) => {
    const errors = [];
    
    if(!user.firstName) errors.push('First name is required');
    if(!user.lastName) errors.push('Last name is required');
    if(user.balance < 0) errors.push('Balance cannot be negative');
    
    if(errors.length > 0) {
        throw new Error(errors.join(', '));
    }
};

// Uso
validateUser(user);
```

**Por qué:** Más errores, más información al usuario.

---

### 4. Usar async/await en lugar de .then()

Ya lo haces bien, pero asegúrate de siempre usar try/catch:

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();
    
    try {
        const userLike = extractUserFromForm();
        await saveUserCallback(userLike);
        hideModal();
    } catch(error) {
        console.error('Error saving user:', error);
        // mostrar error al usuario
    }
});
```

**Por qué:** Maneja errores de forma clara.

---

### 5. Usar constantes para métodos HTTP

**Actual:**
```js
method: 'PATCH'
method: 'POST'
```

**Mejor:**
```js
const HTTP_METHODS = {
    CREATE: 'POST',
    UPDATE: 'PATCH',
    DELETE: 'DELETE'
};

// Uso
const res = await fetch(url, {
    method: HTTP_METHODS.UPDATE,
    // ...
});
```

**Por qué:** Evita typos, más legible.

---

## Resumen de lo que aprendiste

| Concepto | Qué es | Por qué |
|---|---|---|
| **if(user.id)** | Valida si es creación o actualización | El ID determina si es nuevo o existente |
| **PATCH vs POST** | PATCH actualiza, POST crea | Métodos HTTP diferentes para operaciones diferentes |
| **Mappers** | Traducen entre formatos | El servidor y la app hablan idiomas diferentes |
| **onUserChanged** | Actualiza el store | Mantiene la tabla sincronizada con los cambios |
| **{...loadedUser}** | Copia el usuario original | Mantiene el ID cuando editas |
| **renderTable()** | Redibuja la tabla | Muestra los cambios al usuario |

---

## Eres un experto cuando...

✅ Entiendes por qué necesitas el ID para actualizar
✅ Sabes la diferencia entre PATCH y POST
✅ Entiendes cómo los mappers traducen formatos
✅ Sabes cómo onUserChanged mantiene el store sincronizado
✅ Puedes explicar el flujo completo sin mirar el código
✅ Identificas mejoras en el código (como las 5 que mencioné)
✅ Puedes implementar manejo de errores
✅ Entiendes por qué {...loadedUser} es importante
