Backbone.AssociativeModel = Backbone.Model.extend({
    _namespace: window,

    //Optionally, call `Backbone.AssociativeModel.prototype.namespace` to set a namespace in which Backbone-Associative should
    //search for your models (used in `viaReverseKey` to look up models).  Models can be 2 levels deep.  Defaults to `window`.
    namespace: function(nameSpace) {
        this._namespace = _.isString(nameSpace) ? eval(nameSpace) : nameSpace;
    },

    constructor: function(attributes, options) {
        Backbone.Model.prototype.constructor.apply(this, arguments);
        //trigger special change events to update attributes obtained through associations when those associations are set during initial instantiation
        _(this.attributes).each(function(v,k) {  this.trigger('change:'+k, this, this.get(k), options);  },  this);
    },

    set: function(attributes, options) {
        //override Backbone.Model#set to initialize associations.  `Backbone.Model.prototype.constructor` calls `set` before `initialize`.
        //Hat tip to Backbone-Relational for this trick!

        if (this.associations && !this._preppedForAssociations) {
            this.prepForAssociations();
            this.associations(); //executes the `associations` function in user's model class
        }

        return Backbone.Model.prototype.set.apply(this, arguments);
    },

    prepForAssociations: function() {
        var associations = this._associations = []; //association descriptors
        this._associations.add = function(associationKey) {
            if (!_(associations).chain().pluck('name').include(associationKey).value()) associations.push({name: associationKey});
        };
        this._associationsToExcludeFromJSON = [];

        this._preppedForAssociations = true;
    },

    _setupAssociation: function(associatedKey, setupFunction) {
        var self = this;
        self._associations.add(associatedKey);

        setupFunction(associatedKey);

        var returnObj = {
            through: function(joinKey) {
                // Associations can obtain their content "through" other associations by specifying a key on the other association that will return models.
                // When the `through` and `viaKey` options are specified for a `hasMany` association on a model, that model will have a collection of "join models"
                // (assigned to its `joinKey` attribute), which hold both itself and the other "joined" model.  Backbone-Associative literally goes through these
                // "join models" to fetch the other "joined" models from them ("other" meaning other than our original model), depositing these in a collection of
                // joined models on the original model under an attribute with the association name specified.
                if (!_(self._associations).chain().pluck('name').include(joinKey)) throw "Model with cid "+self.cid+" does not have an association of joinModel called "+ joinKey+".";

                return _.extend(returnObj, {
                    viaKey: function(key) {
                        var associatedCollection = self.get(associatedKey);
                        if (associatedCollection && associatedCollection instanceof Backbone.Collection) {
                            var joinCollection = self.get(joinKey);
                            joinCollection.on('add', function(model) {
                                var collectionOfModelsFoundThrough = self.get(associatedKey);
                                if (collectionOfModelsFoundThrough.include(model.get(key))) return;

                                if (model.has(key)) collectionOfModelsFoundThrough.add(model.get(key));
                                else model.on('change:'+key, function(model, keyModel) {
                                    if (keyModel && collectionOfModelsFoundThrough.include(keyModel) === false) collectionOfModelsFoundThrough.add(keyModel);
                                });

                            })
                            .on('remove', function(model) {  self.get(associatedKey).remove(model.get(key));  });
                        } else {
                            //when modelThroughWhichModelFoundThroughIsFound is set, set modelFoundThrough
                            var handler = function(hostModel, joinModel, options) {
                                !!joinModel && joinModel.has(key) ? self.set(associatedKey, joinModel.get(key)) : self.unset(associatedKey);
                            };
                            self.on('change:'+joinKey, handler);
                        }
                        delete returnObj.viaKey;
                        return returnObj;
                    }
                });
            },

            viaReverseKey: function(reverseAssociationKey) {
                var associationObj = _(self._associations).detect(function(assocObj) {return assocObj.name === associatedKey;});
                associationObj.viaReverseKey = reverseAssociationKey;
                return returnObj;
            },

            includeInJSON: function(value) {
                if (value === false) self._associationsToExcludeFromJSON.push(associatedKey);
                return returnObj;
            }
        };

        return returnObj;
    },

    setReciprocalAssociationIfPresent: function(associatedModel, associatedKey) {
        //3 valid cases in which we set reciprocal association:
        //1: viaReverseKey === associatedKey and there is only one association w/ viaReverseKey === associatedKey
        //2: viaReverseKey === associatedKey && associationName === model's class name & there is only one like this
        //3: there is no association with viaReverseKey === associatedKey but there is one and only one association with association name === model's class name
        if (_.isUndefined(associatedModel._associations)) return;

        var viaReverseKeyIsSameAsAssociatedKey = function(assocObj) {
                return assocObj.viaReverseKey && _(  assocObj.viaReverseKey.split(/\s+/)  ).include(associatedKey);
            },

            associationNameIsNameOfHostModelsClass = function(assocObj) {
                var classifyAssociationName = function(modelName) {
                        var rootNameSpace = Backbone.AssociativeModel.prototype._namespace;
                        if (rootNameSpace[modelName]) return rootNameSpace[modelName];

                        if (modelName.charAt(modelName.length - 1) === 's') {
                            var modelNameWithoutTrailingS = modelName.substring(0, modelName.length - 1);
                            if (rootNameSpace[modelNameWithoutTrailingS]) return rootNameSpace[modelNameWithoutTrailingS];
                        }

                        var modelSubNameSpaces = _(rootNameSpace).chain().keys().select(function(k) { return !_.isFunction(rootNameSpace[k]); }).value(),
                            modelSubNameSpaceForThisModel = _(modelSubNameSpaces).detect(function(ns) {
                                var original = _.isFunction(rootNameSpace[ns][modelName]) && new rootNameSpace[ns][modelName]() instanceof Backbone.AssociativeModel,
                                    withoutTrailingS;

                                if (modelNameWithoutTrailingS) {
                                    withoutTrailingS = _.isFunction(rootNameSpace[ns][modelNameWithoutTrailingS])
                                                            && new rootNameSpace[ns][modelNameWithoutTrailingS]() instanceof Backbone.AssociativeModel;
                                }

                                return original || withoutTrailingS;
                            });

                        if (rootNameSpace[modelSubNameSpaceForThisModel]) {
                            if (!modelNameWithoutTrailingS) return rootNameSpace[modelSubNameSpaceForThisModel][modelName];
                            else return rootNameSpace[modelSubNameSpaceForThisModel][modelNameWithoutTrailingS];
                        }
                    },

                    associationName = assocObj.name,
                    upperCaseAssociationName = associationName.replace(associationName.charAt(0), associationName.charAt().toUpperCase());

                return this.constructor === classifyAssociationName(upperCaseAssociationName);
            },

            setReciprocalAssociation = function(assocObj) {
                var attrName = assocObj.aliasName || assocObj.name,
                    attr = associatedModel.get(attrName);
                if (attr instanceof Backbone.Collection) {
                    //screen out additions that could be duplicate due to change events fired on initial instantiation
                    if (attr.include(this) === false) attr.add(this);
                } else {
                    associatedModel.set(attrName, this);
                    this.on('destroy', function() {  if (associatedModel.get(attrName) === this) associatedModel.unset(attrName);  },  this);
                }
            };

        var associationsWithViaReverseKeySameAsAssociatedKey = _(associatedModel._associations).select(viaReverseKeyIsSameAsAssociatedKey),
            len = associationsWithViaReverseKeySameAsAssociatedKey.length;

        if (len === 1) {
            setReciprocalAssociation.call(this, associationsWithViaReverseKeySameAsAssociatedKey[0]);
        } else if (len > 1) {
            var associationsWithSameViaReverseKeyAndModelName = _(associationsWithViaReverseKeySameAsAssociatedKey).select(associationNameIsNameOfHostModelsClass, this);
            if (associationsWithSameViaReverseKeyAndModelName.length === 1) setReciprocalAssociation.call(this, associationsWithSameViaReverseKeyAndModelName[0]);
        } else if (len === 0) {
            var associationsWithSameModelName = _(associatedModel._associations).chain().select(associationNameIsNameOfHostModelsClass, this);
            associationsWithSameModelName.each(setReciprocalAssociation, this);
        }
    },

    hasMany: function(associatedKey, destroyHostModelWhenCollectionIsEmptied) {
        var self = this,
            setupHasMany = function(associatedKey, collection) {
                var prepHasManyCollection = function(associatedKey, collection) {
                    collection || (collection = new Backbone.Collection());
                    collection.on('destroy', collection.remove, collection)
                        .on('add', function(model) {  this.trigger('add:'+associatedKey, model);  },  self)
                        .on('add', function(model) {  this.setReciprocalAssociationIfPresent(model, associatedKey);  },  self)
                        .on('remove', function(model, collection, options) {
                            this.trigger('remove:'+associatedKey, model, collection, options);
                            if (destroyHostModelWhenCollectionIsEmptied && collection.size() === 0) this.destroy(options);
                        },  self);
                    return collection;
                };

                var hasManyCollection = prepHasManyCollection(associatedKey, collection);

                self.set(associatedKey, hasManyCollection);
            };

        var returnObj = _.extend(this._setupAssociation(associatedKey, setupHasMany), {
            collection: function(CustomCollectionClass) {
                setupHasMany(associatedKey, new CustomCollectionClass());
                return returnObj;
            },

            fromAttributes: function(attrNameArray) {
                var aggregateCollection = self.get(associatedKey), fromAttribute, handler;

                _.each(attrNameArray, function(attrName) {
                    if (!_(self._associations).chain().pluck('name').include(attrName)) throw "Model with cid "+self.cid+" does not have an association called "+ attrName+".";

                    fromAttribute = self.get(attrName);
                    if (fromAttribute instanceof Backbone.Collection) {
                        fromAttribute.on('add', aggregateCollection.add, aggregateCollection).on('remove', aggregateCollection.remove, aggregateCollection);
                    } else {
                        //if the fromAttribute is a model, add it to aggregateCollection when it gets set on host model, and remove it when it gets unset
                        handler = function(hostModel, fromAttributeVal) {
                            if (!!fromAttributeVal && hostModel.has(attrName)) {
                                if (aggregateCollection.include(fromAttributeVal) === false) aggregateCollection.add(fromAttributeVal);
                                if (hostModel.previous(attrName)) aggregateCollection.remove(hostModel.previous(attrName));
                            } else {
                               aggregateCollection.remove(fromAttributeVal);
                            }
                        };
                        self.on('change:'+attrName, handler);
                    }
                });
                return returnObj;
            }
        });

        return returnObj;
    },

    //`hasOne` associations serve 2 purposes:
    //(1) Give you a convenient place to document related models you'll be setting as attributes on a given model.
    //(2) Handle serializing and deserializing these models into and out of JSON.
    hasOne: function(associatedKey) {
        var self = this,
            setHasOneBindings = function(associatedKey) {
                var handler = function(hostModel, associatedModel, options) {
                    if (!associatedModel) return;
                    hostModel.setReciprocalAssociationIfPresent(associatedModel, associatedKey);
                    associatedModel.on('destroy', function(model, collection, options) {
                        if (hostModel.get(associatedKey) === associatedModel) hostModel.unset(associatedKey, options);
                    });
                };
                self.on('change:'+associatedKey, handler);
            };

        return this._setupAssociation(associatedKey, setHasOneBindings);
    },

    belongsToMany: function(associatedKey) {
        var destroyHostModelWhenCollectionIsEmptied = true;
        return this.hasMany(associatedKey, destroyHostModelWhenCollectionIsEmptied);
    },

    belongsTo: function(associatedKey) {
        var self = this,
            setBelongsToBindings = function(associatedKey) {
                var handler = function(hostModel, associatedModel, options) {
                    if (!associatedModel) return;
                    hostModel.setReciprocalAssociationIfPresent(associatedModel, associatedKey);
                    associatedModel.on('destroy', function(model, collection, options) {  hostModel.destroy(options);  });
                };
                self.on('change:'+associatedKey, handler);
            };

        return this._setupAssociation(associatedKey, setBelongsToBindings);
    },

    toJSON: function() {
        var json = {};

        _.each(this.attributes, function(value, key) {
            if (_(this._associations).chain().pluck('name').include(key).value()) {
                if (_(this._associationsToExcludeFromJSON).include(key)) return;

                if (value instanceof Backbone.Collection && value.size() > 0) {
                    json[key] = value.map(function(m) {return m.toJSON();});
                } else if (value instanceof Backbone.AssociativeModel) {
                    json[key] = value.toJSON();
                }
            } else {
                json[key] = value;
            }
        },  this  );

        return json;
    }
});
