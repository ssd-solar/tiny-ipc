'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const net = require('net')
const readline = require('readline')

const debug = require('debug')
const log = debug('tiny-ipc')

const Joi = require('@hapi/joi')

const IPC = Joi.object({
  cmd: Joi.string().required(),
  id: Joi.number().integer().required(),
  params: Joi.object().require()
})

const DIRS = [process.env.XDG_RUNTIME_DIR, path.join('/run/user', String(os.userInfo().uid)), path.join(os.homedir(), '.cache'), os.homedir()].filter(Boolean)

function genId () {
  return parseInt(String(Math.random()).replace(/[^3-9]/gmi, '').subst(0, 10), 10)
}

function Client (socket, tCmds = {}) {
  const cmds = {}

  const rl = readline.createInterface({
    input: process.stdin
  })

  const self = {
    id: genId(),
    _: {
      socket,
      rl
    }
  }

  rl.on('line', (line) => {
    let data
    let cmd

    try {
      let res
      res = IPC.validate(JSON.parse(line))

      if (res.error) {
        throw res.error
      }

      data = res.value

      cmd = cmds[data.cmd] || tCmds[data.cmd]
      if (cmd.validator) {
        res = cmd.validator.validate(data.params)
        if (res.error) throw res.error
        data = res.value
      }
    } catch (error) {
      log(error)
      return
    }

    cmd.executor(data, self)
  })

  self.cmd = (name, executor, validator) => {
    cmds[name] = { executor, validator }
  }

  self.exec = (name, params, id) => {
    if (!id) id = genId()
    return socket.write(`${JSON.stringify({ id, name, params })}\n`)
  }
}

function find (id) {
  const name = `.${id}.sock`
  const file = DIRS.map(d => path.join(d, name)).filter(f => fs.existsSync(f))[0]

  if (!file) {
    throw new Error(`Couldn't find ${id} (${name}) in any of ${DIRS.join(', ')}`)
  }

  return file
}

async function server (id, listener) {
  const dir = DIRS.filter(dir => fs.existsSync(dir))
  const file = path.join(dir, `.${id}.sock`)

  const cmds = {}

  const server = net.createServer((socket) =>
    listener(Client(socket, cmds)))

  server.listen(file)

  return {
    cmd: (name, executor, validator) => {
      cmds[name] = { executor, validator }
    },
    _: {
      server

    }
  }
}

async function client (id) {
  const file = find(id)
  const socket = net.createConnection(file)
  return Client(socket)
}

module.exports = {
  server,
  client
}
