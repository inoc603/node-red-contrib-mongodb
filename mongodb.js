var mongo = require('mongodb')
  , _ = require('lodash')
var MongoClient = mongo.MongoClient

function ensureSelector(selector) {
  if (selector != null && ((!_.isObject(selector)) || Buffer.isBuffer(selector))) {
    return {}
  }
  return selector
}

function find(coll, msg, cb) {
  coll.find(msg.payload, msg.projection || {})
      .sort(msg.sort)
      .limit(Number(msg.limit))
      .skip(Number(msg.skip))
      .toArray(cb)
}

function remove(coll, msg, cb) {
  if (msg.single)
    coll.deleteOne(msg.payload, cb)
  else
    coll.deleteMany(msg.payload, cb)
}

function insert(coll, msg, cb) {
  coll.insert(msg.payload, function (err, res) {
    if (_.isFunction(cb)) {
      cb(err, _.pick(res, ['result', 'ops']))
    }
  })
}

function update(coll, msg, cb) {
  var opts = _.pick(msg, ['upsert'])
  if (msg.multi)
    coll.updateMany(msg.query || {}, msg.payload, opts, cb)
  else
    coll.updateOne(msg.query || {}, msg.payload, opts, cb)
}

function count(coll, msg, cb) {
  coll.count(msg.payload, cb)
}

function save(coll, msg, cb) {
  coll.save(msg.payload, cb)
}

function aggregate(coll, msg, cb) {
  msg.payload = Array.isArray(msg.payload) ? msg.payload : [msg.payload]
  coll.aggregate(msg.payload, cb)
}

var handlers = {
  find: find
, insert: insert
, count: count
, update: update
, delete: remove
, save: save
}

module.exports = function (RED) {
  function MongoConfigNode(n) {
    RED.nodes.createNode(this, n)
    this.hostname = n.hostname
    this.port = n.port
    this.db = n.db
    this.name = n.name

    this.url = 'mongodb://'
    this.credentials = this.credentials || {}
    if (this.credentials.user && this.credentials.password) {
      this.url += this.credentials.user + ':' + this.credentials.password + '@'
    }
    this.url += this.hostname + ':' + this.port + '/' + this.db
  }
  RED.nodes.registerType('mongodb-config', MongoConfigNode, {
    credentials: {
      user: {type: 'text'},
      password: {type: 'password'}
    }
  })

  function MongoCrudNode(n) {
    RED.nodes.createNode(this, n)
    this.collection = n.collection
    this.mongodb = n.mongodb
    this.operation = n.operation
    this.single = n.single
    this.multi = n.multi
    this.upsert = n.upsert
    this.nooutput = n.nooutput
    this.mongoConfig = RED.nodes.getNode(this.mongodb)

    this.on('close', function () {
      if (this.db)
        this.db.close()
    })

    if (this.mongoConfig) {
      var node = this
      MongoClient.connect(this.mongoConfig.url, function (err, db) {
        if (err) {
          node.error(err)
        }
        else {
          node.db = db
          node.on('input', function (msg) {
            var opts = ['operation', 'collection', 'single', 'multi', 'upsert']
            opts.map(function (opt) {
              msg[opt] = msg[opt] || node[opt]
            })
            if (!msg.operation)
              return node.error('No operation')
            if (!msg.collection)
              return node.error('No collection')

            var coll = node.db.collection(msg.collection)

            msg.payload = ensureSelector(msg.payload)

            handlers[msg.operation](coll, msg, function (err, res) {
              if (err)
                node.error(err, msg)
              else {
                msg.payload = res
                node.send(msg)
              }
            })
          })
        }
      })
    }
    else {
      this.error('Missing Config')
    }
  }
  RED.nodes.registerType('mongodb-crud', MongoCrudNode)
}
