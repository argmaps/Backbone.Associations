describe("BelongsTo", function() {
    describe("Given a model with a belongsTo association to another model class that has a hasOne association to the first model class", function() {
        beforeEach(function() {
            IndependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('dependentModel');
                }
            });

            DependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('independentModel');
                }
            });

            this.dependentModel = new DependentModel();
            this.independentModel = new IndependentModel();
        });

        describe("when setting the belongsTo attribute on the dependent model to the independent model", function() {
            beforeEach(function() {
                this.dependentModel.set('independentModel', this.independentModel);
            });

            it("makes the dependent model available via independentModel.get('hasOneAssociationName')", function() {
                expect(this.independentModel.get('dependentModel')).toBe(this.dependentModel);
            });

            it("makes the independent model available via dependentModel.get('belongsToAssociationName')", function() {
                expect(this.dependentModel.get('independentModel')).toBe(this.independentModel);
            });

            it("calling #destroy on the model with the hasOne association causes #destroy to be called on the model with the belongsTo association", function() {
                spyOn(this.dependentModel, 'destroy');
                this.independentModel.destroy();
                expect(this.dependentModel.destroy).toHaveBeenCalled();
            });
        });
    });

    describe("When using the #viaReverseKey('reverseKeyName') option, and then setting an associated attribute on the model without the #viaReverseKey option,", function() {
        beforeEach(function() {
            IndependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('dependentModel');
                }
            });

            DependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.belongsTo('independentModel').viaReverseKey('dependentModel');
                }
            });

            this.dependentModel = new DependentModel();
            this.independentModel = new IndependentModel();

            this.independentModel.set('dependentModel', this.dependentModel);
        });

        it("modelWithReverseKey.get('reverseKeyAssociationName') returns the associated model", function() {
            expect(this.dependentModel.get('independentModel')).toBe(this.independentModel);
        });

        it("destroying the associated model causes it not to be returned by modelWithReverseKey.get('reverseKeyAssociationName')", function() {
            this.independentModel.destroy();
            expect(this.dependentModel.get('independentModel')).not.toBeDefined();
        });

    });
});

