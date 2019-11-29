sap.ui.define([
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (
	MessageBox,
	MessageToast) {
	"use strict";

	return {

		addToCart: function (oBundle, oProduct, oCartModel) {
			// Items to be added from the welcome view have it's content inside product object
			if (oProduct.Product !== undefined) {
				oProduct = oProduct.Product;
			}
			this._updateCartItem(oBundle, oProduct, oCartModel);
		},

		/**
		 * Function that updates the cart model when a product is added to the cart.
		 * If the product is already in the cart the quantity is increased.
		 * If not, the product is added to the cart with quantity 1.
		 * @private
		 * @param {Object} oBundle i18n bundle
		 * @param {Object} oProductToBeAdded Product that is added to the cart
		 * @param {Object} oCartModel Cart model
		 */
		_updateCartItem: function (oBundle, oProductToBeAdded, oCartModel) {
			// find existing entry for product
			var oCollectionEntries = Object.assign({}, oCartModel.getData()["cartEntries"]);
			var oCartEntry = oCollectionEntries[oProductToBeAdded.product_id];
			
			if (oCartEntry === undefined) {
				// create new entry
				oCartEntry = Object.assign({}, oProductToBeAdded);
				oCartEntry.Quantity = 1;
				oCollectionEntries[oProductToBeAdded.product_id] = oCartEntry;
			} else {
				// update existing entry
				oCartEntry.Quantity += 1;
			}
			//update the cart model
			oCartModel.setProperty("/cartEntries", Object.assign({}, oCollectionEntries));
			oCartModel.refresh(true);
			MessageToast.show("Added to Shopping Cart");
		}
	};
});