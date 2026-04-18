# onUserChanged — Análisis real de qué pasa

## El estado actual

```js
const state = {
    currentPage: 0,
    users: [],  // ← SOLO CONTIENE LOS 10 USUARIOS DE LA PÁGINA ACTUAL
}

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
        state.users.push(updatedUser);
    }
}
```

## La pregunta clave

> "¿Verifica el total de usuarios o solo los de la página actual?"

**Respuesta:** Solo los de la página actual.

`state.users` **siempre tiene exactamente 10 usuarios** (los de la página actual).

---

## Traza paso a paso

### Escenario: Estás en página 1, editas usuario con ID 5

```
Página 1 tiene: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

state.users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
state.currentPage = 1

Editas usuario 5:
    ↓
saveUser(userLike) se ejecuta
    ↓
usersStore.onUserChanged(updatedUser con id=5)
    ↓
map() busca usuario con id=5
    → LO ENCUENTRA en la lista
    → wasFound = true
    → lo reemplaza
    ↓
state.users = [1, 2, 3, 4, 5*, 6, 7, 8, 9, 10]  (5 actualizado)
    ↓
if(state.users.length < 10 && !wasFound)
if(10 < 10 && false)
if(false && false)
if(false)  ← NO ENTRA
    ↓
Resultado: Usuario 5 actualizado en la tabla ✅
```

---

### Escenario: Estás en página 1, editas usuario con ID 25 (está en página 3)

```
Página 1 tiene: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

state.users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
state.currentPage = 1

Editas usuario 25 (que está en página 3):
    ↓
saveUser(userLike) se ejecuta
    ↓
usersStore.onUserChanged(updatedUser con id=25)
    ↓
map() busca usuario con id=25
    → NO LO ENCUENTRA en la lista
    → wasFound = false
    → devuelve todos los usuarios sin cambios
    ↓
state.users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  (sin cambios)
    ↓
if(state.users.length < 10 && !wasFound)
if(10 < 10 && true)
if(false && true)
if(false)  ← NO ENTRA
    ↓
Resultado: Usuario 25 NO se agrega a la lista
           La tabla sigue mostrando página 1 sin cambios
           Cuando navegues a página 3, verás usuario 25 actualizado ✅
```

---

## Ahora tu pregunta: ¿Qué pasa si tengo más de 10?

**Respuesta:** Nunca tendrás más de 10 en `state.users`.

Mira cómo se carga:

```js
const loadNextPage = async() => {
    const { pages, users } = await loadUsersByPage(state.currentPage + 1);
    
    // users siempre tiene 10 elementos (o menos en la última página)
    
    state.currentPage += 1;
    state.users = users;  // ← REEMPLAZA COMPLETAMENTE
}
```

**Cada vez que navegas, `state.users` se reemplaza completamente con los 10 usuarios de la nueva página.**

---

## Entonces, ¿cuándo entra el if?

```js
if(state.users.length < 10 && !wasFound) {
    state.users.push(updatedUser);
}
```

**Casos en que entra:**

### Caso 1: Última página con menos de 10 usuarios

```
Tienes 55 usuarios totales
Página 6 tiene: [51, 52, 53, 54, 55]  (solo 5 usuarios)

state.users.length = 5
state.currentPage = 6

Editas usuario 100 (que no existe, pero imaginemos):
    ↓
wasFound = false
state.users.length < 10 = true
    ↓
if(5 < 10 && true)
if(true && true)
if(true)  ← ENTRA
    ↓
state.users.push(updatedUser)
state.users = [51, 52, 53, 54, 55, 100]  (6 usuarios)
```

### Caso 2: Nunca en páginas completas

```
Página 1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
state.users.length = 10

Editas usuario 25:
    ↓
wasFound = false
state.users.length < 10 = false
    ↓
if(10 < 10 && true)
if(false && true)
if(false)  ← NO ENTRA
```

---

## El propósito real del if

El desarrollador pensó:

> "Si estoy en la última página (menos de 10 usuarios) y edito un usuario que no está aquí, lo agrego para que vea el cambio inmediatamente"

Pero eso es **innecesario** porque:

1. Si editas un usuario de otra página, no está en `state.users`
2. El usuario verá los cambios cuando navegue a esa página
3. Agregar usuarios desordena la paginación

---

## Ejemplo real: Qué pasa en tu app

```
Total de usuarios: 55
Página 1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

Estás viendo página 1
Editas usuario 5:
    ✅ Se actualiza en la tabla inmediatamente

Editas usuario 25 (página 3):
    ❌ No pasa nada en la tabla
    ✅ Cuando navegas a página 3, ves el cambio

Editas usuario 55 (página 6, última):
    ❌ No pasa nada en la tabla
    ✅ Cuando navegas a página 6, ves el cambio
```

---

## La confusión

Tu pregunta fue:

> "¿Qué pasa si tengo 11 usuarios y wasFound es false?"

**La respuesta es:** Nunca tendrás 11 usuarios en `state.users` porque:

1. `state.users` se reemplaza completamente cada vez que navegas
2. json-server devuelve exactamente 10 usuarios por página
3. Solo la última página puede tener menos de 10

---

## Entonces, ¿el if es útil?

**Sí, pero solo en la última página:**

```
Página 6 (última): [51, 52, 53, 54, 55]

Editas usuario 55:
    ✅ Se actualiza en la tabla

Editas usuario 25 (página 3):
    → wasFound = false
    → state.users.length = 5 < 10 = true
    → if(5 < 10 && true) = true
    → state.users.push(updatedUser)
    → state.users = [51, 52, 53, 54, 55, 25]  ← DESORDENA
```

**Problema:** Agrega el usuario 25 en la página 6, desorden total.

---

## La solución correcta

**Opción 1: Solo actualizar (RECOMENDADO)**

```js
const onUserChanged = (updatedUser) => {
    state.users = state.users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
    );
}
```

**Por qué:**
- Simple
- Sin bugs
- Respeta la paginación
- Si editas usuario de otra página, lo ves cuando navegas

**Opción 2: Agregar solo si es la última página**

```js
const onUserChanged = (updatedUser) => {
    let wasFound = false;
    
    state.users = state.users.map(user => {
        if(user.id === updatedUser.id) {
            wasFound = true;
            return updatedUser;
        }
        return user;
    });
    
    // Solo agrega si es la última página (menos de 10 usuarios)
    // Y el usuario no estaba en la lista
    if(!wasFound && state.users.length < 10) {
        state.users.push(updatedUser);
    }
}
```

**Diferencia con el actual:** Quitamos `state.users.length < 10` de la condición del if.

**Espera, eso es lo mismo que tienes...**

---

## Ahora entiendo tu confusión

Tu código actual **ya está correcto** para el caso de la última página:

```js
if(state.users.length < 10 && !wasFound) {
    state.users.push(updatedUser);
}
```

**Funciona así:**

- Si `state.users.length < 10` → estás en la última página
- Si `!wasFound` → el usuario no está en esta página
- Entonces agrega el usuario

**El problema es que desordena la paginación**, pero técnicamente funciona.

---

## Mi recomendación final

**Usa la Opción 1 (solo actualizar):**

```js
const onUserChanged = (updatedUser) => {
    state.users = state.users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
    );
}
```

**Por qué:**
- Más simple
- Sin desorden de paginación
- Es lo que hace la mayoría de apps
- El usuario puede navegar si quiere ver cambios de otra página

---

## Resumen

| Pregunta | Respuesta |
|---|---|
| ¿Verifica total o solo página actual? | Solo página actual (10 usuarios) |
| ¿Cuándo entra el if? | Solo en la última página (< 10 usuarios) |
| ¿Qué pasa si editas usuario de otra página? | No se agrega (excepto en última página) |
| ¿Es un bug? | No, funciona como está diseñado, pero desordena |
| ¿Cuál es la mejor solución? | Solo actualizar, sin agregar |
