# loadedUser — Explicación profunda y alternativas

## ¿Qué es loadedUser?

`loadedUser` es una variable que guarda el usuario original que cargaste del servidor. Su único propósito es **mantener el ID cuando editas**.

```js
let loadedUser = {};  // variable global del módulo

const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value = user.lastName;
    form.querySelector('[name="balance"]').value = user.balance;
    
    loadedUser = user;  // ← GUARDA EL USUARIO ORIGINAL
}
```

---

## El problema que resuelve

Imagina que editas un usuario. El formulario tiene estos campos:

```html
<input name="firstName" value="Mia">
<input name="lastName" value="Wade">
<input name="balance" value="1455.08">
```

Cuando haces submit, extraes los datos del formulario:

```js
const formData = new FormData(form);
const userLike = {};

for(const [key, value] of formData) {
    userLike[key] = value;
}

// userLike es:
// {
//   firstName: "Mia",
//   lastName: "Wade",
//   balance: "1455.08"
// }
```

**Problema:** ¿Dónde está el `id`? El formulario no tiene un campo `<input name="id">`, así que el ID se perdió.

Sin el ID, `saveUser` no sabe si es creación o actualización:

```js
if(user.id) {
    // actualizar
} else {
    // crear
}
```

**Solución:** `loadedUser` guarda el usuario original con el ID. Cuando editas, copias `loadedUser` y sobrescribes solo los campos que cambiaron:

```js
const userLike = {...loadedUser};  // copia con ID

for(const [key, value] of formData) {
    userLike[key] = value;  // sobrescribe solo lo que cambió
}

// userLike es:
// {
//   id: "5",              ← MANTIENE EL ID
//   firstName: "Mia",
//   lastName: "Wade",
//   balance: "1455.08"
// }
```

---

## Analogía: El pasaporte

Imagina que tienes un pasaporte (el usuario original con ID). Cuando viajas, necesitas llevar el pasaporte contigo. Si lo dejas en casa, no puedes demostrar quién eres.

```
Pasaporte original (loadedUser)
    ↓
Lo llevas al viaje (copias con {...loadedUser})
    ↓
Cambias algunos datos en el viaje (editas el formulario)
    ↓
Vuelves a casa con el pasaporte + cambios
```

Sin el pasaporte, no sabes a quién actualizar.

---

## El código actual (con loadedUser)

```js
let loadedUser = {};

export const showModal = async(id) => {
    modal?.classList.remove('hide-modal');
    loadedUser = {};  // limpia el anterior

    if(!id) return;  // nuevo usuario

    const user = await getUserById(id);
    setFormValues(user);
}

const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value = user.lastName;
    form.querySelector('[name="balance"]').value = user.balance;
    form.querySelector('[name="isActive"]').value = user.isActive;
    
    loadedUser = user;  // ← GUARDA EL ORIGINAL
}

form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userLike = {...loadedUser};  // ← COPIA CON ID
    
    for(const [key, value] of formData) {
        // sobrescribe solo lo que cambió
        userLike[key] = value;
    }

    await saveUserCallback(userLike);
    hideModal();
});
```

---

## Alternativa 1: Usar un campo oculto en el formulario

En lugar de guardar `loadedUser` en una variable, puedes guardar el ID en un campo oculto del formulario:

```html
<!-- En render-modal.html -->
<form>
    <input type="hidden" name="id">  <!-- ← CAMPO OCULTO -->
    <input type="text" name="firstName">
    <input type="text" name="lastName">
    <input type="number" name="balance">
    <input type="checkbox" name="isActive">
</form>
```

```js
const setFormValues = (user) => {
    form.querySelector('[name="id"]').value = user.id;  // ← GUARDA EL ID
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value = user.lastName;
    form.querySelector('[name="balance"]').value = user.balance;
    form.querySelector('[name="isActive"]').value = user.isActive;
}

form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userLike = Object.fromEntries(formData);  // ← SIMPLE, INCLUYE EL ID
    
    // Conversiones de tipos
    userLike.balance = +userLike.balance;
    userLike.isActive = userLike.isActive === 'on';

    await saveUserCallback(userLike);
    hideModal();
});
```

**Ventajas:**
- El ID está en el formulario, donde pertenece
- No necesitas una variable global `loadedUser`
- Más limpio y predecible

**Desventajas:**
- El HTML es más complejo

---

## Alternativa 2: Usar un objeto de estado (más limpio)

En lugar de una variable global `loadedUser`, usa un objeto de estado que represente el modal:

```js
const modalState = {
    user: null,
    isOpen: false
};

export const showModal = async(id) => {
    modalState.isOpen = true;
    modal?.classList.remove('hide-modal');
    modalState.user = null;  // limpia el anterior

    if(!id) return;  // nuevo usuario

    const user = await getUserById(id);
    modalState.user = user;  // ← GUARDA EN EL ESTADO
    setFormValues(user);
}

const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value = user.lastName;
    form.querySelector('[name="balance"]').value = user.balance;
    form.querySelector('[name="isActive"]').value = user.isActive;
}

form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userLike = {...modalState.user};  // ← COPIA DEL ESTADO
    
    for(const [key, value] of formData) {
        userLike[key] = value;
    }

    await saveUserCallback(userLike);
    hideModal();
});

export const hideModal = () => {
    modal?.classList.add('hide-modal');
    form.reset();
    modalState.isOpen = false;
    modalState.user = null;
};
```

**Ventajas:**
- El estado está centralizado
- Fácil de debuggear
- Escalable si necesitas más propiedades

**Desventajas:**
- Un poco más de código

---

## Alternativa 3: Usar un patrón de Factory (más profesional)

Crea una clase que maneje el estado del modal:

```js
class ModalManager {
    constructor(formElement) {
        this.form = formElement;
        this.currentUser = null;
    }

    setUser(user) {
        this.currentUser = user;
        this.fillForm(user);
    }

    fillForm(user) {
        this.form.querySelector('[name="firstName"]').value = user.firstName;
        this.form.querySelector('[name="lastName"]').value = user.lastName;
        this.form.querySelector('[name="balance"]').value = user.balance;
        this.form.querySelector('[name="isActive"]').value = user.isActive;
    }

    getFormData() {
        const formData = new FormData(this.form);
        const userLike = {...this.currentUser};  // ← COPIA DEL USUARIO ACTUAL
        
        for(const [key, value] of formData) {
            userLike[key] = value;
        }
        
        return userLike;
    }

    clear() {
        this.currentUser = null;
        this.form.reset();
    }
}

// Uso
let modalManager;

export const renderModal = (element, saveUserCallback) => {
    if(modal) return;

    modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    modal.className = 'modal-container hide-modal';
    form = modal.querySelector('form');
    
    modalManager = new ModalManager(form);  // ← INSTANCIA EL MANAGER

    form.addEventListener('submit', async(e) => {
        e.preventDefault();
        const userLike = modalManager.getFormData();  // ← USA EL MANAGER
        await saveUserCallback(userLike);
        hideModal();
    });

    element.append(modal);
}

export const showModal = async(id) => {
    modal?.classList.remove('hide-modal');
    modalManager.clear();

    if(!id) return;

    const user = await getUserById(id);
    modalManager.setUser(user);  // ← USA EL MANAGER
}

export const hideModal = () => {
    modal?.classList.add('hide-modal');
    modalManager.clear();
}
```

**Ventajas:**
- Muy limpio y profesional
- Fácil de testear
- Responsabilidades claras

**Desventajas:**
- Más código
- Quizás overkill para este caso

---

## Comparación de alternativas

| Alternativa | Complejidad | Limpieza | Escalabilidad |
|---|---|---|---|
| **loadedUser actual** | Baja | Media | Baja |
| **Campo oculto** | Baja | Alta | Media |
| **modalState** | Media | Alta | Alta |
| **ModalManager** | Alta | Muy Alta | Muy Alta |

---

## Mi recomendación

Para tu proyecto actual, usa la **Alternativa 2 (modalState)** porque:

1. Es más limpio que `loadedUser`
2. Es más simple que `ModalManager`
3. Es escalable si necesitas agregar más funcionalidad
4. El estado está centralizado y es fácil de debuggear

```js
const modalState = {
    user: null
};

// Luego úsalo en lugar de loadedUser
```

---

## Resumen

`loadedUser` es una variable que guarda el usuario original para mantener el ID cuando editas. Existen alternativas más limpias:

1. **Campo oculto en el formulario** → Simple, directo
2. **Objeto de estado (modalState)** → Recomendado, escalable
3. **Clase ModalManager** → Profesional, pero quizás excesivo

La idea central es la misma: **necesitas el ID para saber que es una actualización, no una creación**.
