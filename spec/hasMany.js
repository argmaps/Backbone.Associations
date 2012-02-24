describe("HasMany", function() {
    describe("when setting a hasMany association on a model", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({});
            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {  this.hasMany('associatedModels');  }
            });
            this.subject = new SubjectModel();
        });

        it("#get('associationKey') is defined", function() {
            expect(this.subject.get('associatedModels')).toBeDefined();
        });

        it("this._associations[associationKey] is defined", function() {
            expect(_(this.subject._associations).pluck('name')).toContain('associatedModels');
        });

        it("#get('associationKey') returns a Backbone Collection", function() {
            expect(this.subject.get('associatedModels') instanceof Backbone.Collection).toBeTruthy();
        });

        it("#get('associationKey') has 0 models in it to begin with", function() {
            expect(this.subject.get('associatedModels').size()).toEqual(0);
        });

        it("#get('associationKey').add adds models to the collection", function() {
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);
            expect(this.subject.get('associatedModels').size()).toEqual(1);
            expect(this.subject.get('associatedModels').first()).toBe(associatedModel);
        });

        it("a model that doesn't have an association defined in its #associations does not have that association in its #associations property", function() {
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);
            expect(associatedModel.get('subjectModel')).toBeUndefined();
            expect(associatedModel._associations).not.toBeDefined();
        });

        it("#get('associationKey').remove removes models from the collection", function() {
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);
            expect(this.subject.get('associatedModels').size()).toEqual(1);
            this.subject.get('associatedModels').remove(associatedModel);
            expect(this.subject.get('associatedModels').size()).toEqual(0);
        });

        it("#destroy'ed associated models are removed from the hasMany collection", function() {
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);
            associatedModel.destroy();
            expect(this.subject.get('associatedModels').size()).toEqual(0);
        });

        it("when #destroy is called on a model belonging to another collection in addition to the hasMany collection, the model is still removed from the hasMany collection", function() {
            var associatedModel = new AssociatedModel(),
                randoCollection = new Backbone.Collection();
            randoCollection.add(associatedModel);
            this.subject.get('associatedModels').add(associatedModel);
            associatedModel.destroy();
            expect(this.subject.get('associatedModels').size()).toEqual(0);
        });

        it("#toJSON for a model with a hasMany returns JSON including JSON for models in the hasMany association", function() {
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);
            expect(this.subject.toJSON().associatedModels[0]).toEqual(associatedModel.toJSON());
        });

    });

    describe("when setting a hasMany association with a custom collection", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({});
            this.CustomCollection = Backbone.Collection.extend({});
            var self = this;
            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('associatedModels').collection(self.CustomCollection);
                }
            });

            this.subject = new SubjectModel();
        });

        it("subject#get('associatedCollectionKey') returns an instance of the custom collection class", function() {
            expect(this.subject.get('associatedModels') instanceof this.CustomCollection).toBeTruthy();
        });
    });

    describe("when setting a hasMany association with includeInJSON = false", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({});
            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('associatedModels').includeInJSON(false);
                }
            });

            this.subject = new SubjectModel();
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);
        });

        it("subject#toJSON does not include a key for 'associatedCollectionKey'", function() {
            expect(_(this.subject.toJSON()).keys()).not.toContain('associatedModels');
        });
    });

    describe("when setting a hasMany association with `through` set to an attribute that is a collection of models", function() {
        beforeEach(function() {
            JoinModelClass = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('subjectClass');
                    this.hasOne('otherModel');
                }
            });

            SubjectClass = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('joinModels');
                    this.hasMany('hmtModels').through('joinModels').viaKey('otherModel');
                }
            });

            this.subject = new SubjectClass();

            this.otherModelForJoinModel = new Backbone.AssociativeModel();
            this.joinModel = new JoinModelClass().set({subjectClass: this.subject, otherModel: this.otherModelForJoinModel});

            this.subject.get('joinModels').add(this.joinModel);
        });

        it("adding a joinModel to the subject's joinModels attr results in subject#get('hmtModels') including the otherModel in the joinModel", function() {
            expect(this.subject.get('hmtModels').first()).toBe(this.otherModelForJoinModel);
        });

        it("when removing a joinModel from the joinModelCollection, the otherModel is no longer included in subject#get('hmtModels')", function() {
            this.subject.get('joinModels').remove(this.joinModel);
            expect(this.subject.get('hmtModels').include(this.otherModelForJoinModel)).toBeFalsy();
        });

        it("when destroying a joinModel in the joinModelCollection, the otherModel is no longer included in subject#get('hmtModels')", function() {
            this.joinModel.destroy();
            expect(this.subject.get('hmtModels').include(this.otherModelForJoinModel)).toBeFalsy();
        });
    });

    describe("when setting a hasMany association with `fromAttributes` set to an array of attributes that are collections of models", function() {
        beforeEach(function() {
            JoinModelClass1 = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('subjectClass');
                    this.hasOne('otherModel');
                }
            });

            JoinModelClass2 = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('subjectClass');
                    this.hasOne('otherModel');
                }
            });

            SubjectClass = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('joinModels1');
                    this.hasMany('joinModels2');
                    this.hasMany('modelsViaFrom').fromAttributes(['joinModels1', 'joinModels2']);
                }
            });

            this.subject = new SubjectClass();

            this.otherModelForJoinModel = new Backbone.AssociativeModel();
            this.joinModel1 = new JoinModelClass1({subjectClass: this.subject, otherModel: this.otherModelForJoinModel});
            this.joinModel2 = new JoinModelClass2({subjectClass: this.subject, otherModel: this.otherModelForJoinModel});

            this.subject.get('joinModels1').add(this.joinModel1);
            this.subject.get('joinModels2').add(this.joinModel2);
        });

        it("adding models to the subject's joinModels1 and joinModels2 attrs results in subject#get('modelsViaFrom') including those models", function() {
            expect(this.subject.get('modelsViaFrom').include(this.joinModel1)).toBeTruthy();
            expect(this.subject.get('modelsViaFrom').include(this.joinModel2)).toBeTruthy();
            expect(this.subject.get('modelsViaFrom').size()).toEqual(2);
        });

        it("when removing a joinModel from the joinModelCollection, the joinModel is no longer included in subject#get('modelsViaFrom')", function() {
            this.subject.get('joinModels1').remove(this.joinModel1);
            expect(this.subject.get('modelsViaFrom').include(this.joinModel1)).toBeFalsy();
        });

        it("when destroying a joinModel in the joinModelCollection, the otherModel is no longer included in subject#get('modelsViaFrom')", function() {
            this.joinModel2.destroy();
            expect(this.subject.get('modelsViaFrom').include(this.joinModel2)).toBeFalsy();
            expect(this.subject.get('modelsViaFrom').size()).toEqual(1);
        });
    });

    describe("when setting a hasMany association with `fromAttributes` set to an array containing one hasMany attribute, and one hasOne attribute,", function() {
        beforeEach(function() {
            JoinModelClass1 = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('subjectClass');
                    this.hasOne('otherModel');
                }
            });

            AssociatedModelClass = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('subjectModel');
                }
            });

            SubjectClass = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('joinModels1');
                    this.hasOne('associatedModelForFromAttributes');
                    this.hasMany('modelsViaFrom').fromAttributes(['joinModels1', 'associatedModelForFromAttributes']);
                }
            });

            this.subject = new SubjectClass();

            this.otherModelForJoinModel = new Backbone.AssociativeModel();
            this.joinModel1 = new JoinModelClass1({subjectClass: this.subject, otherModel: this.otherModelForJoinModel});
            this.associatedModelForFromAttributes = new AssociatedModelClass();
        });

        it("adding models to the hasMany collection in `fromAttributes` adds them to the subject's modelsViaFrom collection", function() {
            this.subject.get('joinModels1').add(this.joinModel1);
            expect(this.subject.get('modelsViaFrom').include(this.joinModel1)).toBeTruthy();
        });

        it("setting a model to the hasOne attribute listed in `fromAttributes` adds that model to the subject's modelsViaFrom collection", function() {
            this.subject.set('associatedModelForFromAttributes', this.associatedModelForFromAttributes);
            expect(this.subject.get('modelsViaFrom').include(this.associatedModelForFromAttributes)).toBeTruthy();
        });

        it("setting a model to the hasOne attribute and then unsetting the hasOne attribute results in the subject's modelsViaFrom collection not including that model", function() {
            this.subject.get('joinModels1').add(this.joinModel1);
            this.subject.unset('associatedModelForFromAttributes');
            expect(this.subject.get('modelsViaFrom').include(this.associatedModelForFromAttributes)).toBeFalsy();
        });

        it("setting a model to the hasOne attribute listed in `fromAttributes`, and then setting the hasOne attribute to a different model removes the first model from the subject's modelsViaFrom collection", function() {
            this.subject.set('associatedModelForFromAttributes', this.associatedModelForFromAttributes);
            var anotherAssociatedModel = new AssociatedModelClass();
            this.subject.set('associatedModelForFromAttributes', anotherAssociatedModel);
            expect(this.subject.get('modelsViaFrom').include(this.associatedModelForFromAttributes)).toBeFalsy();
            expect(this.subject.get('modelsViaFrom').include(anotherAssociatedModel)).toBeTruthy();
        });
    });

    describe("when adding a model to a hasMany collection", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({});
            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('associatedModels');
                }
            });

            this.subject = new SubjectModel();
        });

        it("triggers an add:associationCollectionKey event on the model to which the hasMany is assigned", function() {
            spyOn(this.subject, 'trigger');
            var associatedModel = new AssociatedModel(),
                associatedModelsCollection = this.subject.get('associatedModels'),
                options = {};

            associatedModelsCollection.add(associatedModel, options);

            expect(this.subject.trigger).toHaveBeenCalledWith('add:associatedModels', associatedModel, associatedModelsCollection, options);
        });

        it("triggers a remove:associationCollectionKey event on the model to which the hasMany is assigned", function() {
            var associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(associatedModel);

            spyOn(this.subject, 'trigger');
            var collection = associatedModel.collection,
                options = jasmine.createSpy('options');
            this.subject.get('associatedModels').remove(associatedModel, options);

            expect(this.subject.trigger).toHaveBeenCalledWith('remove:associatedModels', associatedModel, collection, options);
        });
    });

    describe("when a model has a hasMany association to another model class, and that other model class has a belongsTo association to the first model class", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('subjectModel');
                }
            });

            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('associatedModels');
                }
            });

            this.subject = new SubjectModel();
            this.associatedModel = new AssociatedModel();
            this.subject.get('associatedModels').add(this.associatedModel);
        });

        it("when adding a model to the first model's associated models collection, set the associated model's subjectModel attribute to the first model", function() {
            expect(this.associatedModel.get('subjectModel')).toBe(this.subject);
        });

        it("when an instance of the first model class is destroyed, all instances of the second model class that are associated to it should be destroyed as well", function() {
            spyOn(this.associatedModel, 'destroy');
            this.subject.destroy();
            expect(this.associatedModel.destroy).toHaveBeenCalled();
        });
    });

    describe("When using the #viaReverseKey('reverseKeyName') option, and then setting an associated attribute on the model without the #viaReverseKey option,", function() {
        beforeEach(function() {
            AssociatedModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('subjectModel');
                }
            });

            SubjectModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasMany('associatedModels').viaReverseKey('subjectModel');
                }
            });

            this.subject = new SubjectModel();
            this.associatedModel1 = new AssociatedModel();
            this.associatedModel2 = new AssociatedModel();

            this.associatedModel1.set('subjectModel', this.subject);
            this.associatedModel2.set('subjectModel', this.subject);
        });

        it("modelWithReverseKey.get('reverseKeyAssociationName') returns the associated models", function() {
            expect(this.subject.get('associatedModels').first()).toBe(this.associatedModel1);
            expect(this.subject.get('associatedModels').last()).toBe(this.associatedModel2);
            expect(this.subject.get('associatedModels').size()).toEqual(2);
        });

        it("destroying the associated model causes it not to be returned by modelWithReverseKey.get('reverseKeyAssociationName')", function() {
            this.associatedModel1.destroy();
            expect(this.subject.get('associatedModels').first()).not.toBe(this.associatedModel1);
        });
    });
});
