/* MongoosePlugin
 *
 * A plugin middleware for AuditLog and Mongoose that automates the propagation of event logging for Mongoose callbacks
 *
 */
var MongoosePlugin = function(options) {

    this._options = {
        auditLog:null,          // instance of AuditLog
        modelName:'untitled',   // string name of model
        namePath:null,          // path to readable object name field
        idPath:'_id',           // path to unique ID field
        versionPath:'__v',      // path to mongoose object version number
        debug: false,           // show debug messages
        storeDoc: ['remove']    // name of callbacks that should store document in description field, if any
    };

    // override default options with the provided values
    if(typeof options !== 'undefined') {
        for(var attr in options) {
            this._options[attr] = options[attr];
        }
    }

    var self = this;

    /* handler
     *
     * This is a mongoose plugin-able handler function.  Example:
     *
     * var auditFn = auditLog.getPlugin('mongoose', {modelName:'myModel', namePath:'title'});
     * MySchema.plugin(auditFn.handler);
     *
     */
    this.handler = function(schema, options) {
        var actor = null,
            options = options || {};

        schema.pre('save', function(next) {
            if(typeof options.actorFn == 'function') {
                actor = options.actorFn();
            }

          if(this.isNew) {
              self._options.auditLog.logEvent(
                  actor, // actor
                  'mongoose', // origin
                  'Created', // action
                  null, // path
                  self._options.modelName, // label
                  this._id, // object
                  '' // description
              );
              next();
          }

          var modified_paths = this.modifiedPaths();

          for(var i=0; i<modified_paths.length; i++) {
              if(!modified_paths[i].match(/modified_at/) && this.isDirectModified(modified_paths[i])) {

                  if(modified_paths[i] == 'date' && !this._emitDate) continue;

                  self._options.auditLog.logEvent(
                      actor, // actor
                      'mongoose', // origin
                      'Updated', // action
                      modified_paths[i], // path
                      self._options.modelName, // label
                      this._id, // object
                      'Updated '+modified_paths[i]+ ' to '+this[modified_paths[i]] // description
                  );
              }
          }

          next();
        });


        /*
         * remove callback
         *
         */
        schema.post('remove', function(doc) {
            var docObj = doc.toObject(),
                description = '';

            if(typeof options.actorFn == 'function') {
                actor = options.actorFn();
            }

            if(self._options.storeDoc.indexOf('remove') >= 0) {
                description = JSON.stringify(docObj);
            } else {
                description = 'Removed "'+docObj[self._options.namePath]+'"';
            }

            // actor, origin, action, path, label, object, description
            self._options.auditLog.logEvent(
              actor, // actor
              'mongoose', // origin
              'Removed', // action
              null, // path
              self._options.modelName, // label
              docObj[self._options.idPath], // object
              description // description
            );
        });
    }
}

exports = module.exports = MongoosePlugin;
