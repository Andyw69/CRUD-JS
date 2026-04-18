# Bug de isActive — Explicación y solución

## El problema

Cuando actualizas o creas un usuario, el campo `isActive` no se actualiza correctamente. Los otros campos (firstName, lastName, balance) funcionan bien, pero el booleano no.

---

## ¿Por qué pasa?

### El problema está en dos lugares

#### 1. En setFormValues (render-modal.js)

```js
const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value  = user.lastName;
    form.querySelector('[name="balance"]').value   = user.balance;
    form.querySelector('[name="isActive"]').value  = user.isActive;  // ❌ AQUÍ
    loadedUser = user;
}
```

**El problema:** Estás asignando a `.value` en un checkbox.

Los checkboxes no funcionan así. Un checkbox tiene dos propiedades:
- `.value` → el valor que envía cuando está checked (por defecto "on")
- `.checked` → booleano que indica si está marcado o no

**Lo que haces:**
```js
form.querySelector('[name="isActive"]').value = true;
// El checkbox sigue sin estar marcado
```

**Lo que deberías hacer:**
```js
form.querySelector('[name="isActive"]').checked = user.isActive;
// Ahora el checkbox está marcado si isActive es true
```

---

#### 2. En el submit (render-modal.js)

```js
for(const [key, value] of formData) {
    if(key === 'isActive') {
        userLike[key] = (value === 'on') ? true : false;  // ❌ AQUÍ
        continue;
    }
    userLike[key] = value;
}
```

**El problema:** Cuando un checkbox NO está marcado, FormData no lo incluye.

```
Checkbox marcado:
  FormData contiene: isActive = "on"
  Tu código: (value === 'on') ? true : false  → true ✅

Checkbox NO marcado:
  FormData NO contiene isActive
  Tu código: nunca entra al if
  userLike.isActive = loadedUser.isActive  (el valor anterior)
```

**Ejemplo:**

```
Usuario original: isActive = true

Desmarcar el checkbox y hacer submit:
  FormData = { firstName: "Maria", lastName: "Wade", balance: 2000 }
  (isActive no está porque no está marcado)
  
  Tu código:
    for(const [key, value] of formData)
      → firstName, lastName, balance se actualizan
      → isActive NO está en el loop
    
    userLike = {...loadedUser}  (copia del original)
    userLike.isActive = true  (del original, no cambió)
  
  Resultado: isActive sigue siendo true ❌
```

---

## Analogía: El interruptor de luz

Imagina que tienes un interruptor de luz:

```
Interruptor encendido (checked = true)
  ↓
Quieres apagarlo (checked = false)
  ↓
Pero tu código solo lee el valor cuando está encendido
  ↓
Nunca se entera de que lo apagaste
```

---

## La solución

### Paso 1: Arreglar setFormValues

```js
const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value  = user.lastName;
    form.querySelector('[name="balance"]').value   = user.balance;
    form.querySelector('[name="isActive"]').checked = user.isActive;  // ✅ CAMBIO
    loadedUser = user;
}
```

**Cambio:** `.value` → `.checked`

---

### Paso 2: Arreglar el submit

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    
    const userLike = {...loadedUser};
    
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
    
    // ✅ AGREGAR ESTO
    // Si el checkbox no está marcado, FormData no lo incluye
    // Así que lo establecemos explícitamente
    if(!formData.has('isActive')) {
        userLike['isActive'] = false;
    }
    
    await saveUserCallback(userLike);
    hideModal();
});
```

**Cambio:** Agregar validación para cuando el checkbox no está marcado.

---

## Solución completa mejorada

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userLike = {...loadedUser};
    
    // Procesa todos los campos
    for(const [key, value] of formData) {
        if(key === 'balance') {
            userLike[key] = +value;
        } else if(key === 'isActive') {
            userLike[key] = value === 'on';
        } else {
            userLike[key] = value;
        }
    }
    
    // Maneja el caso especial del checkbox no marcado
    if(!formData.has('isActive')) {
        userLike['isActive'] = false;
    }
    
    await saveUserCallback(userLike);
    hideModal();
});
```

---

## Alternativa: Usar .checked directamente

En lugar de confiar en FormData, puedes leer el checkbox directamente:

```js
form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userLike = {...loadedUser};
    
    // Procesa campos de texto
    for(const [key, value] of formData) {
        if(key === 'balance') {
            userLike[key] = +value;
        } else if(key !== 'isActive') {  // Salta isActive
            userLike[key] = value;
        }
    }
    
    // Lee isActive directamente del checkbox
    userLike['isActive'] = form.querySelector('[name="isActive"]').checked;
    
    await saveUserCallback(userLike);
    hideModal();
});
```

**Ventaja:** Más claro y explícito.

---

## ¿Qué hiciste mal?

1. **Confundiste `.value` con `.checked`** en setFormValues
2. **No manejaste el caso especial** de checkboxes no marcados en FormData

---

## ¿Cómo evitar estos errores?

### 1. Entiende cómo funcionan los checkboxes

```js
// ❌ INCORRECTO
checkbox.value = true;

// ✅ CORRECTO
checkbox.checked = true;
```

### 2. Entiende cómo funciona FormData con checkboxes

```js
// Checkbox marcado
<input type="checkbox" name="isActive" checked>
FormData incluye: isActive = "on"

// Checkbox NO marcado
<input type="checkbox" name="isActive">
FormData NO incluye: isActive
```

### 3. Siempre valida los booleanos

```js
// ❌ INCORRECTO
userLike.isActive = formData.get('isActive');  // "on" o null

// ✅ CORRECTO
userLike.isActive = formData.has('isActive');  // true o false
// O
userLike.isActive = formData.get('isActive') === 'on';  // true o false
```

### 4. Usa TypeScript (si puedes)

TypeScript te habría avisado:

```ts
// ❌ Error: Property 'checked' does not exist on type 'HTMLInputElement'
// Porque .value es string, no boolean
checkbox.value = user.isActive;

// ✅ Correcto
checkbox.checked = user.isActive;
```

---

## Resumen

| Problema | Causa | Solución |
|---|---|---|
| setFormValues no marca el checkbox | Usas `.value` en lugar de `.checked` | Cambiar a `.checked` |
| isActive no se actualiza al desmarcar | FormData no incluye checkboxes no marcados | Validar con `formData.has('isActive')` |
| Confusión general | No entiendes cómo funcionan los checkboxes | Leer documentación de HTML forms |

---

## Código final recomendado

```js
// setFormValues
const setFormValues = (user) => {
    form.querySelector('[name="firstName"]').value = user.firstName;
    form.querySelector('[name="lastName"]').value = user.lastName;
    form.querySelector('[name="balance"]').value = user.balance;
    form.querySelector('[name="isActive"]').checked = user.isActive;  // ✅
    loadedUser = user;
}

// submit
form.addEventListener('submit', async(e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userLike = {...loadedUser};
    
    for(const [key, value] of formData) {
        if(key === 'balance') {
            userLike[key] = +value;
        } else if(key === 'isActive') {
            userLike[key] = value === 'on';
        } else {
            userLike[key] = value;
        }
    }
    
    // ✅ Maneja el caso especial
    if(!formData.has('isActive')) {
        userLike['isActive'] = false;
    }
    
    await saveUserCallback(userLike);
    hideModal();
});
```

Implementa esto y el bug desaparecerá.
