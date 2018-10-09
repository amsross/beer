'use strict'
const serverless = require('serverless-http')
const bodyParser = require('body-parser')
const express = require('express')
const AWS = require('aws-sdk')
const { dbPut, dbScan, dbUpdate, dbDelete, dbPurge } = require('./utils')

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
    'text': '`beer:list`: List the beers in the list',
    'mrkdwn_in': ['text']
  }, {
    'text': '`beer:add [beer name]`: Add a beer to the list',
    'mrkdwn_in': ['text']
  }, {
    'text': '`beer:remove [beer name]`: Remove a beer from the list',
    'mrkdwn_in': ['text']
  }, {
    'text': '`beer:vote [beer name]`: Vote on a beer in the list',
    'mrkdwn_in': ['text']
  }, {
    'text': '`beer:purge`: Purge all votes from all beers',
    'mrkdwn_in': ['text']
  }]
}))

app.post('/:stage?/add', ({ body: { text: Name, team_id: TeamID, user_id: UserID } }, res) => dbPut(db)({
  Name,
  TeamID,
  UserID
})
  .toCallback((err, data) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || data
  })))

app.post('/:stage?/vote', ({ body: { text: Name, team_id: TeamID, user_id: UserID } }, res) => dbUpdate(db)({
  Name,
  TeamID,
  UserID
})
  .toCallback((err, data) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || data
  })))

app.get('/:stage?/list', ({ query: { team_id: TeamID, user_id: UserID } }, res) => dbScan(db)({
  TeamID,
  UserID
})
  .map(({ Name, Votes }) => ({ Name, Votes: ((Votes || {}).values || []).length }))
  .sortBy((a, b) => b.Votes - a.Votes)
  .map(({ Name, Votes }) => ({ text: `${Name} (${Votes})` }))
  .collect()
  .toCallback((err, beers) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || 'here are your beers:',
    attachments: (beers || [])
  })))

app.post('/:stage?/remove', ({ body: { text: Name, team_id: TeamID, user_id: UserID } }, res) => dbDelete(db)({
  Name,
  TeamID,
  UserID
})
  .toCallback((err, data) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || data
  })))

app.post('/:stage?/purge', ({ body: { team_id: TeamID } }, res) => dbPurge(db)({
  TeamID
})
  .toCallback((err, data) => res.json({
    response_type: 'in_channel',
    text: (err && err.message) || data
  })))

module.exports.handler = serverless(app)
