  A demo app that has two interfaces, one of them is a screen for signing up and other one is for approving the registerations.

In the CAP (Node.js) backend, a Suppliers entity is exposed as an OData service. Two separate SAP UI5
(freestyle) applications consume this service: the Supplier Portal used by external suppliers, and
Supplier Approvals used by the internal team. Both applications open through a Fiori Launchpad and
all requests pass through the Approuter.
