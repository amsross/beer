const h = require('highland')
const { allPass, map, prop } = require('ramda')

const TableName = `${process.env.SERVICE}-${process.env.STAGE}`

// put a document into the db
const dbPut = db => ({ Name, TeamID, UserID }) =>
  h.of({ Name, TeamID, Votes: db.createSet([UserID]) })
    .filter(allPass(map(prop, [
      'Name', 'TeamID', 'Votes'
    ])))
    .otherwise(h.fromError(new Error('incomplete db.put params')))
    .map(Item => ({ TableName, Item }))
    .flatMap(h.wrapCallback((params, cb) => db.put(params, cb)))
    .map(() => `Added ${Name} to the list`)
    .otherwise(h.fromError(new Error('no items created')))

// get multiple documents back from the db
const dbScan = db => ({ TeamID }) =>
  h.of({ TableName, TeamID })
    .filter(allPass(map(prop, [
      'TableName', 'TeamID'
    ])))
    .map(({ TableName, TeamID }) => ({
      TableName,
      Select: 'ALL_ATTRIBUTES',
      FilterExpression: 'TeamID = :TeamID',
      ExpressionAttributeValues: {':TeamID': TeamID}
    }))
    .filter(allPass(map(prop, [
      'TableName', 'Select', 'FilterExpression', 'ExpressionAttributeValues'
    ])))
    .otherwise(h.fromError(new Error('incomplete db.scan params')))
    .flatMap(h.wrapCallback((params, cb) => db.scan(params, cb)))
    .flatMap(x => x && x.Items)
    .otherwise(h.fromError(new Error('no items found')))

// delete one document from the db
const dbDelete = db => ({ Name, TeamID, UserID }) =>
  h.of({ TableName, Name, TeamID })
    .filter(allPass(map(prop, [
      'TableName', 'Name', 'TeamID'
    ])))
    .map(({ TableName, Name, TeamID }) => ({
      TableName,
      Key: { Name },
      ConditionExpression: 'TeamID = :TeamID',
      ExpressionAttributeValues: { ':TeamID': TeamID }
    }))
    .filter(allPass(map(prop, [
      'TableName', 'Key', 'ConditionExpression', 'ExpressionAttributeValues'
    ])))
    .otherwise(h.fromError(new Error('incomplete db.delete params')))
    .flatMap(h.wrapCallback((params, cb) => db.delete(params, cb)))
    .map(() => `Removed ${Name} from the list`)
    .otherwise(h.fromError(new Error('no items removed')))

// update one document in the db
const dbUpdate = db => ({ Name, TeamID, UserID }) =>
  h.of({ TableName, Name, TeamID, UserID })
    .filter(allPass(map(prop, [
      'TableName', 'Name', 'TeamID', 'UserID'
    ])))
    .map(({ TableName, Name, TeamID, UserID }) => ({
      TableName,
      Key: { Name },
      UpdateExpression: 'ADD #Votes :UserID',
      ConditionExpression: '#TeamID = :TeamID',
      ExpressionAttributeNames: {
        '#TeamID': 'TeamID',
        '#Votes': 'Votes'
      },
      ExpressionAttributeValues: {
        ':TeamID': TeamID,
        ':UserID': db.createSet([UserID])
      }
    }))
    .filter(allPass(map(prop, [
      'TableName', 'Key', 'UpdateExpression', 'ConditionExpression', 'ExpressionAttributeNames', 'ExpressionAttributeValues'
    ])))
    .otherwise(h.fromError(new Error('incomplete db.update params')))
    .flatMap(h.wrapCallback((params, cb) => db.update(params, cb)))
    .map(() => `Added vote to ${Name} for ${UserID}`)
    .otherwise(h.fromError(new Error('no items updated')))

// remove all votes from a beer
const dbPurge = db => ({ TeamID }) =>
  // get all the beers
  dbScan(db)({ TeamID })
    // set each beer's Votes to an empty set
    .map(({ Name }) => h.of({ TableName, Name, TeamID })
      .filter(allPass(map(prop, [
        'TableName', 'TeamID', 'Name'
      ])))
      .map(({ TableName, TeamID }) => ({
        TableName,
        Key: { Name },
        UpdateExpression: 'REMOVE #Votes',
        ConditionExpression: '#TeamID = :TeamID',
        ExpressionAttributeNames: {
          '#TeamID': 'TeamID',
          '#Votes': 'Votes'
        },
        ExpressionAttributeValues: {
          ':TeamID': TeamID,
        }
      }))
      .filter(allPass(map(prop, [
        'TableName', 'Key', 'UpdateExpression', 'ConditionExpression', 'ExpressionAttributeNames', 'ExpressionAttributeValues'
      ])))
      .otherwise(h.fromError(new Error(`incomplete db.update params for ${Name}`)))
      .flatMap(h.wrapCallback((params, cb) => db.update(params, cb))))
    .merge()
    .collect()
    .map(() => `Removed all votes for all beers`)
    .otherwise(h.fromError(new Error('no votes removed')))

module.exports = {
  dbPut,
  dbScan,
  dbUpdate,
  dbDelete,
  dbPurge
}
