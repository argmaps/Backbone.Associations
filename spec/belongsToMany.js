//the only difference between hasMany and belongsToMany is that models with the latter are destroyed when their belongsToMany collections are reduced to zero members,
//so the rest of this method is tested by the hasMany spec
describe("#belongsToMany", function() {
    describe("when setting a belongsToMany association on a model", function() {
        beforeEach(function() {
            IndependentModel = Backbone.AssociativeModel.extend({
                associations: function() {
                    this.hasOne('dependentModel');
                }
            });
            DependentModel = Backbone.AssociativeModel.extend({
                associations: function() {  this.belongsToMany('independentModels');  }
            });
            this.dependentModel = new DependentModel();
        });

        it("when a belongsToMany collection's last model is removed, the model with the belongsToMany association is destroyed", function() {
            var independentModel = new IndependentModel();
            this.dependentModel.get('independentModels').add(independentModel);

            spyOn(this.dependentModel, 'destroy');
            this.dependentModel.get('independentModels').remove(independentModel);

            expect(this.dependentModel.destroy).toHaveBeenCalled();
        });
    });
});
