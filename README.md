Backbone-Associative gives simple mono- or bi-directional associations
to Backbone models using the `has` and `belongsTo` association names
familiar from ActiveRecord in Rails. While heavily influenced by
Backbone-Relational, Backbone-Associative differs in two key ways:

1. Associations (and reverse associations) are assigned in their own model classes,
rather than assigning both in a single model class.

```javascript
//Backbone-Associative
House = Backbone.AssociativeModel.extend({
    associations: function() {
        this.hasMany('occupants').viaReverseKey('livesIn');
    }
});

Person = Backbone.AssociativeModel.extend({
    associations: function() {
        this.hasOne('house').includeInJSON(false);
    }
});

//Backbone-Relational
House = Backbone.RelationalModel.extend({
    relations: [
        {
            type: Backbone.HasMany,
            key: 'occupants',
            relatedModel: 'Person',
            includeInJSON: Backbone.Model.prototype.idAttribute,
            collectionType: 'PersonCollection',
            reverseRelation: {
                key: 'livesIn'
            }
        }
    ]
});
```
2. Associations are declared in a chained, sentence-like API, rather
   than by passing in an options hash.  TODO: example comparing syntax

# Usage
To use Backbone-Associative,

1. Extend your model classes from Backbone.AssociativeModel.
2. Add an `associations` function as an instance property on your Backbone.AssociativeModel classes.

```javascript
    Article = Backbone.AssociativeModel.extend({
        associations: function() {
            this.hasMany('comments');
        }
    });

    Comment = Backbone.AssociativeModel.extend({
        associations: function() {
            this.belongsToOne('article');
        }
    });
```
# Associations
* `hasOne` and `hasMany` associations indicate that another class has a
reference to the class to which you assign the `has` association.
* `belongsToOne` and `belongsToMany` associations are the dependent side of
  the association.  When a model's `belongsTo` association is destroyed,
it is destroyed as well.

# Options
* `collection` - pass a custom collection model class to be used for a
  `hasMany` or `belongsToMany` association.
* `viaKey` means "pluck the key named X and assign it to an attribute on the model in which this association is being declared (the attribute's name is the association's name)"
* `viaReverseKey` means "where the model in which this association is being declared is identified by one of the space-separated keys that follow"

# License
MIT.  Use and enjoy!

# Credits
Backbone.Associative is heavily influenced by Backbone-Relational and
owes a debt of gratitude to Paul Uithol.
