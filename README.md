# tiny-ipc

Tiny IPC is an IPC library written in modern JS, meant to have the least code possible

As such it's also very simple: It just support sending simple events back-and-fourth aswell as validating inputs via Joi schemas

# Usage

```js
const IPC = require('tiny-ipc')
const Joi = require('@hapi/joi')

const server = await IPC.server('my-app', client => {
  console.log(`client joined: ${client.id}`)
})

server.cmd('greeting', ({ greeting }, client) => {
  console.log(`${client.id}: ${greeting}`)
}, Joi.object({ greeting: Joi.string().required() }))

const client = await IPC.client('my-app')
client.exec('greeting', 'Hello server')
```
