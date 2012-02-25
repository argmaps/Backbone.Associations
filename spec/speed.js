(function(){
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

    var dependentModel = new DependentModel(),
        independentModel = new IndependentModel();
    JSLitmus.test("set an association that does not declare a viaReverseKey, so that the reciprocal association has to be looked up by the model being set's class name", function() {
        dependentModel.set('independentModel', independentModel);
    });

    dependentModel.prepForAssociations();
    dependentModel.belongsTo('independentModel').viaReverseKey('dependentModel');
    JSLitmus.test("set an association that declares a viaReverseKey", function() {
        dependentModel.set('independentModel', independentModel);
    });

})();
