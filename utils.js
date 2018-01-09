const h = require('highland')
const { allPass, map, prop } = require('ramda')

const TableName = `${process.env.SERVICE}-${process.env.STAGE}`

// put a document into the db
const dbPut = db => ({ Name, TeamID }) =>
  h.of({ Name, TeamID })
    .filter(allPass(map(prop, [
      'Name', 'TeamID'
    ])))
    .otherwise(h.fromError(new Error('incomplete db.put params')))
    .map(Item => ({ TableName, Item }))
    .flatMap(h.wrapCallback((params, cb) => db.put(params, cb)))
    .map(() => `Added ${Name} to the list`)
    .otherwise(h.fromError(new Error('no items created')))

// get multiple documents back from the db
const dbScan = db => ({ TeamID, UserID }) =>
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
    .map(({ Name }) => Name)
    .otherwise(h.fromError(new Error('no items found')))

module.exports = {
  dbPut,
  dbScan
}
