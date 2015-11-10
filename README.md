# node-red-contrib-mongodb

A Node-RED node to interact with MongoDB.

This node is slightly different from the MongoDB node that comes with the Node-RED core. It combines the original input node and output node for MongoDB into one node, with output for every type of operations. So now you're able to get result from operations including delete, insert, save and update, which is not available in the original mongodb-out node. If you don't want output for these operations, there's also an option to turn it off.
