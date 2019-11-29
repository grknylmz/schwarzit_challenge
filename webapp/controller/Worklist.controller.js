sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("zcprod.zcprod.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this.getView().byId("priceMin").setValue(0);
			this.getView().byId("priceMax").setValue(0);
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");
				if (sQuery && sQuery.length > 0) {
					//aTableSearchState = [new Filter("description", FilterOperator.Contains, sQuery)];
					aTableSearchState = this.createDescFilter(sQuery);
				} else {
					var minPrice = this.getView().byId("priceMin").getValue();
					var maxPrice = this.getView().byId("priceMax").getValue();
					if ( minPrice === "0" && maxPrice === "0" ) {
						this._applySearch(aTableSearchState);
						return;
					}
					if (minPrice !== "" && maxPrice !== "") {
						aTableSearchState = [new Filter("price", FilterOperator.BT, minPrice, maxPrice)];
					}
				}
				this._applySearch(aTableSearchState);
			}

		},

		createDescFilter: function (sQuery) {
			var sQueryLower = sQuery.toLowerCase();
			var sQueryUpper = sQuery.toUpperCase();
			var sQueryUpLow =
				sQuery[0].toUpperCase() + sQuery.substr(1).toLowerCase();
			return new Filter({
				filters: [
					new Filter('name', sap.ui.model.FilterOperator.Contains, sQuery),
					new Filter(
						'name',
						sap.ui.model.FilterOperator.Contains,
						sQueryLower
					),
					new Filter(
						'name',
						sap.ui.model.FilterOperator.Contains,
						sQueryUpper
					),
					new Filter(
						'name',
						sap.ui.model.FilterOperator.Contains,
						sQueryUpLow
					),
					new Filter('description', sap.ui.model.FilterOperator.Contains, sQuery),
					new Filter(
						'description',
						sap.ui.model.FilterOperator.Contains,
						sQueryLower
					),
					new Filter(
						'description',
						sap.ui.model.FilterOperator.Contains,
						sQueryUpper
					),
					new Filter(
						'description',
						sap.ui.model.FilterOperator.Contains,
						sQueryUpLow
					)
				],
				and: false
			});
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("product_id")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function (aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		onPressCheckout: function () {
			var oView = this.getView();
			// create dialog lazily
			if (!this.byId("checkoutDialog")) {
				// load asynchronous XML fragment
				Fragment.load({
					id: oView.getId(),
					name: "zcprod.zcprod.view.Checkout",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					oView.addDependent(oDialog);
					oDialog.open();
				});
			} else {
				this.byId("checkoutDialog").open();
			}
		},
		onSubmit: function () {
			var userModel = this.getModel("userModel");
			var oUrlParams = {
				Res: "",
				Uname: this.getView().byId("username").getValue()
			};
			var uname = this.getView().byId("username").getValue();
			userModel.setHeaders({
				"Uname": uname
			});

			userModel.callFunction('/CheckUser', {
				method: 'POST',
				urlParameters: oUrlParams,
				success: function (resp) {
					if (resp.CheckUser.Res === "X") {
						MessageToast.show("User details are correct.");
					} else {
						MessageToast.show("User details are INVALID!!!.");
					}
				},
				error: function () {
					MessageToast.show("Communication error with the backend!");
				}
			});

		}

	});
});