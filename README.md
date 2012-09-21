Backbone-Associative gives simple mono- or bi-directional associations
to Backbone models using the `hasOne`, `hasMany`, and `belongsTo` association names
familiar from ActiveRecord in Rails. While heavily influenced by
Backbone-Relational, Backbone-Associative differs in two key ways:

1. Associations (and reverse associations) are assigned in their own model classes,
rather than assigning both in a single model class.

```javascript
//Backbone-Associative
House = Backbone.AssociativeModel.extend({
    associations: function() {
        this.hasMany('occupants').viaReverseKey('livesIn').modelClass('Person');
    }
});

Person = Backbone.AssociativeModel.extend({
    associations: function() {
        this.hasOne('house');
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
   than by passing in an options hash.  TODO: example showing and comparing syntax; in the meantime, please see the specs.

# Usage
To use Backbone-Associative,

1. Extend your model classes from Backbone.AssociativeModel.
2. Add an `associations` function as an instance property on your Backbone.AssociativeModel classes. Note: associations that depend on other associations should be specified *after* the associations on which they depend.

```javascript
    Article = Backbone.AssociativeModel.extend({
        associations: function() {
            this.hasMany('comments');
        }
    });

    Comment = Backbone.AssociativeModel.extend({
        associations: function() {
            this.belongsTo('article');
        }
    });
```
# Associations
* `hasOne` and `hasMany` associations indicate that another class has a
reference to the class to which you assign the `has` association.
* `belongsTo` associations are the dependent side of the association.  When a model's `belongsTo` association is destroyed,
it is destroyed as well.

# Options
* `collection` - pass a custom collection model class to be used for a `hasMany` association.
* `viaKey` means "pluck the key named X and assign it to an attribute on the model in which this association is being declared (the attribute's name is the association's name)"
* `viaReverseKey` means "where the model in which this association is being declared is identified by one of the space-separated keys that follow"
* `as` is an option passed after `viaReverseKey`. It means "use the associationName" to look up the class of the model in this association, but assign that model to the attribute name I'm passing in to `as`. Use this option when you have more than one `hasOne` association using the same `reverseKey`.
* `modelClassName` is an option passed after `viaReverseKey`. BBA will use the string passed in to this option to look up the class of the model in this association, and will then assign that model to the associationName.  Use this option when you have more than one `hasMany` association using the same `reverseKey`.

## Configuration
Backbone.AssociativeModel has two methods for configuration:
1.  `Backbone.AssociativeModel.namespace`, which accepts a string or
    object to be used as the root namespace when looking up reverse
associations.
2.  `Backbone.AssociativeModel.defaultCollection`, which accepts a
    string or descendant of Backbone.Collection to be used as the
default collection for new HasMany collections.

# License
MIT.  Use and enjoy!

# Credits
Backbone.Associative is heavily influenced by Backbone-Relational and
owes a debt of gratitude to Paul Uithol.
