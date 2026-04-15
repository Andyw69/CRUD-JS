# Mappers en JavaScript — Explicación profunda

## ¿Qué es un Mapper?

Un mapper es una función pura que recibe datos en un formato y los devuelve en otro formato.
No guarda estado, no hace llamadas a APIs, no tiene efectos secundarios. Solo transforma.

```
datos externos (cualquier forma) → mapper → tu modelo interno (forma controlada)
```

---

## ¿Por qué existe?

Tu app no debería depender de cómo un servidor externo decide nombrar sus campos.
Si el servidor cambia `first_name` por `nombre`, sin un mapper tendrías que buscar
y reemplazar en toda tu app. Con un mapper, solo cambias una función.

Es el principio de **separación de responsabilidades**: cada parte de tu código
tiene una sola razón para cambiar.

---

## El problema concreto en este proyecto

El servidor (`db.json`) devuelve esto:

```json
{
  "id": 1,
  "first_name": "Ryan",
  "last_name": "Kent",
  "isActive": false,
  "balance": 1397.32,
  "avatar": "http://placehold.it/32x32",
  "gender": "male"
}
```

Tu modelo `User` espera esto:

```js
new User({
  id: 1,
  firstName: "Ryan",   // camelCase
  lastName: "Kent",    // camelCase
  isActive: false,
  balance: 1397.32,
  avatar: "http://...",
  gender: "male"
})
```

El servidor habla `snake_case`. Tu app habla `camelCase`.
El mapper es el intérprete entre los dos.

---

## La pregunta clave: `firstName: first_name` — ¿qué pasa aquí?

Esta es la parte más importante. Vamos paso a paso.

### Paso 1 — El objeto que llega del servidor

```js
const localhostUser = {
  first_name: "Ryan",
  last_name: "Kent",
  id: 1,
  // ...
}
```

### Paso 2 — Destructuring

```js
const { first_name, last_name, id, ... } = localhostUser;
```

Después de esto tienes variables sueltas en memoria:

```
first_name → "Ryan"   (string, valor primitivo)
last_name  → "Kent"   (string, valor primitivo)
id         → 1        (number, valor primitivo)
```

### Paso 3 — Construir el nuevo objeto

```js
return new User({
  firstName: first_name,
  lastName: last_name,
  id,
  // ...
});
```

Aquí `{ firstName: first_name }` es un **object literal**.
Estás creando un objeto nuevo donde:
- la clave (propiedad) se llama `firstName`
- el valor de esa clave es lo que contiene la variable `first_name`

Que es exactamente lo mismo que escribir:

```js
{ firstName: "Ryan" }
```

No hay ninguna referencia al objeto original. Solo copiaste el valor del string.

---

## ¿Por qué los strings se copian por valor?

En JavaScript los tipos primitivos (string, number, boolean, null, undefined)
se pasan y asignan **por valor**. Eso significa que se copia el dato, no la dirección de memoria.

```js
let a = "Ryan";
let b = a;       // b recibe una COPIA del string "Ryan"

a = "otro";

console.log(b);  // "Ryan" — b no cambió, tenía su propia copia
```

Comparado con objetos (por referencia):

```js
let obj1 = { nombre: "Ryan" };
let obj2 = obj1;   // obj2 apunta a la MISMA dirección de memoria

obj1.nombre = "otro";

console.log(obj2.nombre);  // "otro" — ambos apuntan al mismo objeto
```

En tu mapper, `first_name` es un string → se copia el valor → `firstName` recibe `"Ryan"` de forma independiente.

---

## ¿Sería `firstName: first_name: "Ryan"`?

No. Esa sintaxis no existe en JavaScript.

Lo que ocurre es más simple:

```js
// Esto:
firstName: first_name

// Es equivalente a esto (en tiempo de ejecución):
firstName: "Ryan"
```

`first_name` es solo una variable que contiene `"Ryan"`.
Cuando JavaScript evalúa el object literal, sustituye la variable por su valor.

Puedes verlo así:

```js
const first_name = "Ryan";  // variable con valor "Ryan"

const obj = {
  firstName: first_name     // JS lee: firstName → el valor de first_name → "Ryan"
};

console.log(obj.firstName); // "Ryan"
```

No hay ninguna conexión entre `obj.firstName` y la variable `first_name` después de esto.
Son independientes.

---

## El mapper completo, línea por línea

```js
export const localhostUserToModel = (localhostUser) => {
    
    // 1. Destructuring: extraemos las propiedades del objeto del servidor
    //    como variables independientes
    const {
        avatar,       // avatar → "http://placehold.it/32x32"
        balance,      // balance → 1397.32
        first_name,   // first_name → "Ryan"
        gender,       // gender → "male"
        id,           // id → 1
        isActive,     // isActive → false
        last_name     // last_name → "Kent"
    } = localhostUser;
    
    // 2. Construimos y devolvemos una instancia de User
    //    con los nombres de propiedades que NOSOTROS controlamos
    return new User({
        avatar,                  // avatar: avatar (shorthand, mismo nombre)
        balance,                 // balance: balance (shorthand)
        firstName: first_name,   // RENOMBRAMOS: firstName recibe el valor de first_name
        gender,                  // shorthand
        id,                      // shorthand
        isActive,                // shorthand
        lastName: last_name      // RENOMBRAMOS: lastName recibe el valor de last_name
    });
}
```

Las líneas con shorthand (`avatar,`) son equivalentes a `avatar: avatar`.
Las líneas con renombre (`firstName: first_name`) son donde ocurre la "traducción".

---

## El flujo completo del proyecto

```
db.json
  │
  │  { first_name: "Ryan", last_name: "Kent", ... }
  ▼
loadUsersByPage()   ← hace el fetch, recibe JSON crudo
  │
  │  data = [{ first_name: "Ryan", ... }, ...]
  ▼
localhostUserToModel(data)   ← el mapper traduce
  │
  │  new User({ firstName: "Ryan", ... })
  ▼
users-store.js   ← guarda instancias de User limpias
  │
  ▼
users-app.js   ← renderiza con user.firstName, user.lastName
```

Tu UI nunca sabe que el servidor usaba `first_name`. Solo conoce `firstName`.

---

## ¿Qué pasa si mañana cambias de API?

Sin mapper tendrías que cambiar toda la UI. Con mapper:

```js
// API nueva que devuelve { nombre: "Ryan", apellido: "Kent" }
export const apiUserToModel = (apiUser) => {
    return new User({
        firstName: apiUser.nombre,    // diferente origen
        lastName: apiUser.apellido,   // diferente origen
        // el resto igual...
    });
}
```

Solo cambias el mapper. Tu `User`, tu store, tu UI... intactos.

---

## Resumen

| Concepto | Qué es |
|---|---|
| Mapper | Función que transforma datos de un formato a otro |
| `firstName: first_name` | Asigna el VALOR de la variable `first_name` a la clave `firstName` |
| Strings por valor | Se copian, no se referencian. Son independientes tras la asignación |
| Beneficio principal | Desacopla el formato externo del modelo interno de tu app |
