'use strict'
const serverless = require('serverless-http')
const bodyParser = require('body-parser')
const express = require('express')
const AWS = require('aws-sdk')
const { dbPut, dbScan } = require('./utils')

const app = express()
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
const db = new AWS.DynamoDB.DocumentClient()

app.get('/:stage?/help', (req, res) => res.json({
  response_type: 'in_channel',
  text: 'Try these commands:',
  attachments: [{
    'text': '`beer:list`: List the beers in the list'
  }, {
    'text': '`beer:add [beer name]`: Add a beer to the list'
  }, {
    'text': '`beer:remove [beer name]`: Remove a beer from the list'
  }]
}))

app.post('/:stage?/add', ({ body: { text, team_id, user_id } }, res) => dbPut(db)({
  Name: text,
  TeamID: team_id,
  UserID: user_id
})
  .toCallback((err, data) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || data
  })))

app.get('/:stage?/list', ({ query: { team_id, user_id } }, res) => dbScan(db)({
  TeamID: team_id,
  UserID: user_id
})
  .collect()
  .toCallback((err, beers) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || 'here are your beers:',
    attachments: (beers || [])
  })))

module.exports.handler = serverless(app)
