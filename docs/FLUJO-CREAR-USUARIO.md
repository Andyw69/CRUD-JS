# Flujo completo de crear un usuario

## El viaje de un usuario desde el formulario hasta la base de datos

Vamos a rastrear qué pasa cuando haces click en "Agregar usuario" y completas el formulario.

---

## Paso 1: El usuario hace click en "Agregar usuario"

En `render-add-button.js` hay un botón que abre el modal:

```js
// Alguien hace click en el botón "Agregar usuario"
// → se ejecuta showModal()
// → el modal se hace visible
```

---

## Paso 2: El usuario completa el formulario y hace submit

En `render-modal.js`, el formulario tiene un listener:

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();
    
    // Extrae los datos del formulario
    const formData = new FormData(form);
    
    // Convierte FormData a un objeto JavaScript
    const userLike = {};
    for(const [key, value] of formData){
        if(key === 'balance'){                
            userLike[key] = +value;  // convierte a número
            continue;
        }
        if(key === 'isActive'){
            userLike[key] = (value === 'on') ? true : false;  // convierte a booleano
            continue;
        }
        userLike[key] = value;
    }
    
    // Ahora userLike es algo como:
    // {
    //   firstName: "Andres",
    //   lastName: "Ventura",
    //   balance: 9500,
    //   isActive: true,
    //   avatar: "http://...",
    //   gender: "male"
    //   // NOTA: NO tiene 'id' porque es nuevo
    // }
    
    // Llama al callback que recibió en renderModal
    await saveUserCallback(userLike);
    hideModal();
});
```

---

## Paso 3: El callback es saveUser (definido en users-app.js)

En `users-app.js`:

```js
renderModal(element, async(userLike) => {
    // userLike es el objeto del paso anterior
    const user = await saveUser(userLike);  // ← AQUÍ EMPIEZA LA MAGIA
    usersStore.onUserChanged(user);
    renderTable();
});
```

El callback que pasas a `renderModal` es una función que llama a `saveUser`.

---

## Paso 4: saveUser valida y crea

En `save-user.js`:

```js
export const saveUser = async(userLike) => {
    
    // Paso 4a: Convierte el objeto plano a una instancia de User
    const user = new User(userLike);
    
    // Ahora 'user' es:
    // User {
    //   id: undefined,        ← NO tiene id porque userLike no lo tenía
    //   firstName: "Andres",
    //   lastName: "Ventura",
    //   balance: 9500,
    //   isActive: true,
    //   avatar: "http://...",
    //   gender: "male"
    // }
    
    // Paso 4b: Valida si es nuevo o actualización
    if(user.id) {
        // Si tiene id, es una actualización
        throw 'No implementada la actualizacion';
    }
    
    // Como user.id es undefined, entra aquí
    // Paso 4c: Crea el usuario en el servidor
    const updatedUser = await createUser(user);
    return updatedUser;
};
```

---

## Paso 5: createUser envía al servidor

En `save-user.js`:

```js
const createUser = async(user) => {
    
    // Paso 5a: Prepara la URL
    const url = `${import.meta.env.VITE_BASE_URL}/users`;
    // url = "http://localhost:3000/users"
    
    // Paso 5b: Hace un POST al servidor
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(user),  // convierte el objeto a JSON
        headers: {
            'Content-Type': 'application/json',
        }
    });
    
    // El servidor (json-server) recibe:
    // {
    //   "firstName": "Andres",
    //   "lastName": "Ventura",
    //   "balance": 9500,
    //   "isActive": true,
    //   "avatar": "http://...",
    //   "gender": "male"
    // }
    
    // Paso 5c: json-server automáticamente:
    // - Genera un ID único
    // - Guarda en db.json
    // - Devuelve el usuario con el ID asignado
    
    const newUser = await res.json();
    // newUser es:
    // {
    //   "id": "k0uYq9EOjL0",  ← json-server lo generó
    //   "firstName": "Andres",
    //   "lastName": "Ventura",
    //   "balance": 9500,
    //   "isActive": true,
    //   "avatar": "http://...",
    //   "gender": "male"
    // }
    
    return newUser;
};
```

---

## Paso 6: Vuelve a users-app.js

En `users-app.js`:

```js
renderModal(element, async(userLike) => {
    const user = await saveUser(userLike);  // ← aquí recibe el usuario con ID
    
    // user ahora tiene:
    // {
    //   id: "k0uYq9EOjL0",
    //   firstName: "Andres",
    //   ...
    // }
    
    usersStore.onUserChanged(user);  // actualiza el store
    renderTable();  // redibuja la tabla
});
```

---

## Resumen visual del flujo

```
Usuario hace click en "Agregar"
    ↓
Modal se abre
    ↓
Usuario completa formulario y hace submit
    ↓
renderModal extrae datos → userLike (sin id)
    ↓
saveUserCallback(userLike) se ejecuta
    ↓
saveUser(userLike)
    ├─ new User(userLike) → user sin id
    ├─ if(user.id) → false, no entra
    └─ createUser(user)
        ├─ fetch POST a /users
        ├─ json-server genera id
        ├─ json-server guarda en db.json
        └─ devuelve user CON id
    ↓
usersStore.onUserChanged(user) → actualiza el estado
    ↓
renderTable() → redibuja la tabla con el nuevo usuario
    ↓
Modal se cierra
```

---

## Los puntos clave

| Punto | Qué pasa |
|---|---|
| **userLike** | Objeto plano del formulario, SIN id |
| **new User(userLike)** | Convierte a instancia de User, id sigue siendo undefined |
| **if(user.id)** | Valida: si tiene id es actualización, si no es creación |
| **createUser** | Envía al servidor sin id |
| **json-server** | Genera id automáticamente y guarda |
| **newUser** | Lo que devuelve el servidor, YA tiene id |
| **onUserChanged** | Actualiza el store con el nuevo usuario |

---

## ¿Por qué new User(userLike) si no tiene id?

Porque `new User()` es una validación y normalización. Convierte el objeto plano a una instancia de la clase User, asegurando que tenga la estructura correcta. El `id` será `undefined` hasta que el servidor lo genere.

Es como decir: "Crea una instancia de User con estos datos, aunque algunos campos estén vacíos".
