/* Transaction Center demo backend: in-memory sample data, nothing leaves the browser. Mirrors Code.gs response shapes. */
(function () {
'use strict';
var CHECKLISTS = {
  // C.A.R. 'Residential Listing 1-4 Units' checklist (Agent Hub), LISTING DOCUMENTS ONLY (items 1-18).
  listing: [
    {"title": "Comparative Market Analysis - CMA", "forms": "Listing Documents", "req": true, "code": "L_COMPARATIVE_MARKET_ANALYSIS_"},
    {"title": "Sellers Net Sheet - Signed by Seller(s)", "forms": "Listing Documents", "req": true, "code": "L_SELLERS_NET_SHEET_SIGNED_BY_"},
    {"title": "Agency Disclosure - AD", "forms": "Listing Documents", "req": true, "code": "L_AGENCY_DISCLOSURE_AD"},
    {"title": "Residential Listing Agreement - RLA", "forms": "Listing Documents", "req": true, "code": "L_RESIDENTIAL_LISTING_AGREEMEN"},
    {"title": "Multiple Listing Service Addendum - MLSA", "forms": "Listing Documents", "req": true, "code": "L_MULTIPLE_LISTING_SERVICE_ADD"},
    {"title": "Brokers Compensation Advisory - BCA", "forms": "Listing Documents", "req": true, "code": "L_BROKERS_COMPENSATION_ADVISOR"},
    {"title": "Possible Representation of more than 1 B/S - PRBS", "forms": "Listing Documents", "req": true, "code": "L_POSSIBLE_REPRESENTATION_OF_M"},
    {"title": "Fair Housing and Discrimination Advisory - FHDA", "forms": "Listing Documents", "req": true, "code": "L_FAIR_HOUSING_AND_DISCRIMINAT"},
    {"title": "Sellers Advisory - SA", "forms": "Listing Documents", "req": true, "code": "L_SELLERS_ADVISORY_SA"},
    {"title": "California Consumer Privacy Act Advisory - CCPA", "forms": "Listing Documents", "req": true, "code": "L_CALIFORNIA_CONSUMER_PRIVACY_"},
    {"title": "SELM / Coming Soon", "forms": "Listing Documents · optional", "code": "L_SELM_COMING_SOON"},
    {"title": "Modification of Terms (Seller) - MTLA", "forms": "Listing Documents · optional", "code": "L_MODIFICATION_OF_TERMS_SELLER"},
    {"title": "MLS Print out (Active)", "forms": "Listing Documents", "req": true, "code": "L_MLS_PRINT_OUT_ACTIVE"},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "L_MISC1", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "L_MISC2", "misc": true},
    {"title": "Rejected Offers - Complete Offer (& sup docs)", "forms": "Listing Documents · optional", "code": "L_REJECTED_OFFERS_COMPLETE_OFF"},
    {"title": "Email to BA Rejecting Offer and pg 16 of RPA", "forms": "Listing Documents · optional", "code": "L_EMAIL_TO_BA_REJECTING_OFFER_"},
    {"title": "Cancellation of Listing", "forms": "Required to request cancellation", "code": "CANCEL_LISTING", "cancel": true}
  ],
  // Purchase items unlocked when a listing converts to a purchase (seller side): the 'Transaction' part of the same C.A.R. listing checklist (items 22-88).
  purchase_seller: [
    {"title": "MLS Active/Pending", "forms": "Sales Documentation", "req": true, "code": "P_MLS_ACTIVE_PENDING"},
    {"title": "Property Profile", "forms": "Sales Documentation", "req": true, "code": "P_PROPERTY_PROFILE"},
    {"title": "Agency Disclosure - AD for Buyers Agent", "forms": "Sales Documentation", "req": true, "code": "P_AGENCY_DISCLOSURE_AD_FOR_BUY"},
    {"title": "Residential Purchase Agreement - RPA 07/24", "forms": "Sales Documentation", "req": true, "code": "P_RESIDENTIAL_PURCHASE_AGREEME"},
    {"title": "Buyers Investigation Advisory - BIA", "forms": "Sales Documentation", "req": true, "code": "P_BUYERS_INVESTIGATION_ADVISOR"},
    {"title": "Possible Representation of more than 1 B/S - PRBS", "forms": "Sales Documentation", "req": true, "code": "P_POSSIBLE_REPRESENTATION_OF_M"},
    {"title": "Fair Housing and Discrimination Advisory - FHDA", "forms": "Sales Documentation", "req": true, "code": "P_FAIR_HOUSING_AND_DISCRIMINAT"},
    {"title": "Buyers Homeowners Insurance Advisory - BHIA", "forms": "Sales Documentation", "req": true, "code": "P_BUYERS_HOMEOWNERS_INSURANCE_"},
    {"title": "Wire Fraud Advisory -WFA - Signed by All Parties", "forms": "Sales Documentation", "req": true, "code": "P_WIRE_FRAUD_ADVISORY_WFA_SIGN"},
    {"title": "California Consumer Privacy Act Advisory - CCPA", "forms": "Sales Documentation", "req": true, "code": "P_CALIFORNIA_CONSUMER_PRIVACY_"},
    {"title": "FHA/VA Notice & Addendum", "forms": "Sales Documentation · optional", "code": "P_FHA_VA_NOTICE_ADDENDUM"},
    {"title": "Manufactured Home Addendum", "forms": "Sales Documentation", "req": true, "code": "P_MANUFACTURED_HOME_ADDENDUM"},
    {"title": "Counter Offers/Addendums", "forms": "Sales Documentation · optional", "code": "P_COUNTER_OFFERS_ADDENDUMS"},
    {"title": "Cancellation of Contract & Release of Deposit", "forms": "Required to request cancellation", "code": "CANCEL_CONTRACT", "cancel": true},
    {"title": "Escrow Acknowledgment of RPA - Page 17", "forms": "Escrow Documentation", "req": true, "code": "P_ESCROW_ACKNOWLEDGMENT_OF_RPA"},
    {"title": "Escrow Receipt of Earnest Money Deposit - EMD", "forms": "Escrow Documentation", "req": true, "code": "P_ESCROW_RECEIPT_OF_EARNEST_MO"},
    {"title": "Escrow Instructions", "forms": "Escrow Documentation", "req": true, "code": "P_ESCROW_INSTRUCTIONS"},
    {"title": "Escrow Amendments", "forms": "Escrow Documentation · optional", "code": "P_ESCROW_AMENDMENTS"},
    {"title": "Commission Instructions sign by Client and Broker", "forms": "Escrow Documentation", "req": true, "code": "P_COMMISSION_INSTRUCTIONS_SIGN"},
    {"title": "Statement of Affiliated Services -InHouse Escrow", "forms": "Escrow Documentation · optional", "code": "P_STATEMENT_OF_AFFILIATED_SERV"},
    {"title": "Affidvt of NonForeign- AS/Sellers FIRPTA 1 or QA 1", "forms": "Escrow Documentation", "req": true, "code": "P_AFFIDVT_OF_NONFOREIGN_AS_SEL"},
    {"title": "Real Estate Transfer Disclosure - TDS", "forms": "Disclosures", "req": true, "code": "P_REAL_ESTATE_TRANSFER_DISCLOS"},
    {"title": "Seller Property Questionnaire or ESD - SPQ", "forms": "Disclosures", "req": true, "code": "P_SELLER_PROPERTY_QUESTIONNAIR"},
    {"title": "Agent Visual Inspection Disc. - ENESMA Realty Agent", "forms": "Disclosures", "req": true, "code": "P_AGENT_VISUAL_INSPECTION_DISC"},
    {"title": "Agent Visual Inspection Disc. - Coop Agent", "forms": "Disclosures", "req": true, "code": "P_AGENT_VISUAL_INSPECTION_DISCX"},
    {"title": "Statewide Buyer and Seller Advisory - SBSA", "forms": "Disclosures", "req": true, "code": "P_STATEWIDE_BUYER_AND_SELLER_A"},
    {"title": "Market Conditions Advisory - MCA", "forms": "Disclosures", "req": true, "code": "P_MARKET_CONDITIONS_ADVISORY_M"},
    {"title": "Water Conserving Fixtures/Carbon Monoxide- WCMD", "forms": "Disclosures", "req": true, "code": "P_WATER_CONSERVING_FIXTURES_CA"},
    {"title": "Square Footage and Lot Size Advisory - SFLS", "forms": "Disclosures", "req": true, "code": "P_SQUARE_FOOTAGE_AND_LOT_SIZE_"},
    {"title": "Environmental Hazards/Lead/Mold Booklet Receipt", "forms": "Disclosures", "req": true, "code": "P_ENVIRONMENTAL_HAZARDS_LEAD_M"},
    {"title": "Wildfire Disaster Advisory - If Area w Prior Fires", "forms": "Disclosures", "req": true, "code": "P_WILDFIRE_DISASTER_ADVISORY_I"},
    {"title": "Fire Hardening and Defensible Space Advisory -FHDS", "forms": "Disclosures", "req": true, "code": "P_FIRE_HARDENING_AND_DEFENSIBL"},
    {"title": "Receipt For Reports - RFR or Receipt of Docs", "forms": "Disclosures · optional", "code": "P_RECEIPT_FOR_REPORTS_RFR_OR_R"},
    {"title": "Home Warranty or Waiver", "forms": "Disclosures", "req": true, "code": "P_HOME_WARRANTY_OR_WAIVER"},
    {"title": "Notice of Your Supplemental Prop Tax Bill - SPT", "forms": "Disclosures", "req": true, "code": "P_NOTICE_OF_YOUR_SUPPLEMENTAL_"},
    {"title": "For Your Protection Get a Home Inspection - HID (For FHA/VA)", "forms": "Disclosures · optional", "code": "P_FOR_YOUR_PROTECTION_GET_A_HO"},
    {"title": "Lead-Base Paint Hazards Disclosure- Before 1978", "forms": "Disclosures · optional", "code": "P_LEAD_BASE_PAINT_HAZARDS_DISC"},
    {"title": "Water Heater and Smoke Detector - WHS If No TDS", "forms": "Disclosures · optional", "code": "P_WATER_HEATER_AND_SMOKE_DETEC"},
    {"title": "Earthquake Hazards Report Signed by All Pre-1960", "forms": "Disclosures · optional", "code": "P_EARTHQUAKE_HAZARDS_REPORT_SI"},
    {"title": "Notice to Perform / Demand to Close Escrow -NBP,NSP,DCE", "forms": "Disclosures · optional", "code": "P_NOTICE_TO_PERFORM_DEMAND_TO_"},
    {"title": "Request For Repairs & Response (RR & RRRR)", "forms": "Disclosures · optional", "code": "P_REQUEST_FOR_REPAIRS_RESPONSE"},
    {"title": "Contingency Removals - CR", "forms": "Disclosures · optional", "code": "P_CONTINGENCY_REMOVALS_CR"},
    {"title": "Solar Advisory and Questionnaire", "forms": "Disclosures · optional", "code": "P_SOLAR_ADVISORY_AND_QUESTIONN"},
    {"title": "Extension of Time- ETA", "forms": "Disclosures · optional", "code": "P_EXTENSION_OF_TIME_ETA"},
    {"title": "Seller to Remain in Possession - SIP", "forms": "Disclosures · optional", "code": "P_SELLER_TO_REMAIN_IN_POSSESSI"},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC1", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC2", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC3", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC4", "misc": true},
    {"title": "Preliminary Title Report", "forms": "Reports and Invoices", "req": true, "code": "P_PRELIMINARY_TITLE_REPORT"},
    {"title": "Preliminary Title Report - Approval by Buyer", "forms": "Reports and Invoices", "req": true, "code": "P_PRELIMINARY_TITLE_REPORT_APP"},
    {"title": "Termite Report or BIW", "forms": "Reports and Invoices", "req": true, "code": "P_TERMITE_REPORT_OR_BIW"},
    {"title": "Termite Report Clearance signed by Buyer", "forms": "Reports and Invoices", "req": true, "code": "P_TERMITE_REPORT_CLEARANCE_SIG"},
    {"title": "Property Inspection Report or BIW", "forms": "Reports and Invoices", "req": true, "code": "P_PROPERTY_INSPECTION_REPORT_O"},
    {"title": "NHD Report", "forms": "Reports and Invoices", "req": true, "code": "P_NHD_REPORT"},
    {"title": "NHD Receipt Signed by ALL parties", "forms": "Reports and Invoices", "req": true, "code": "P_NHD_RECEIPT_SIGNED_BY_ALL_PA"},
    {"title": "Appraisal Report", "forms": "Reports and Invoices · optional", "code": "P_APPRAISAL_REPORT"},
    {"title": "CCRS & HOA Signed Receipt", "forms": "Reports and Invoices · optional", "code": "P_CCRS_HOA_SIGNED_RECEIPT"},
    {"title": "Additional Reports", "forms": "Reports and Invoices · optional", "code": "P_ADDITIONAL_REPORTS"},
    {"title": "Invoices", "forms": "Reports and Invoices · optional", "code": "P_INVOICES"},
    {"title": "Referral Fee Agreement -RFA", "forms": "Reports and Invoices · optional", "code": "P_REFERRAL_FEE_AGREEMENT_RFA"},
    {"title": "CDA - Commission Disbursement Authorization", "forms": "Reports and Invoices · optional", "code": "P_CDA_COMMISSION_DISBURSEMENT_"},
    {"title": "Verification of Property Condition - VP", "forms": "Closing Documents", "req": true, "code": "P_VERIFICATION_OF_PROPERTY_CON"},
    {"title": "Closing Statement", "forms": "Closing Documents", "req": true, "code": "P_CLOSING_STATEMENT"},
    {"title": "Conversation Log - ex. Emails, Text Messages", "forms": "Closing Documents", "req": true, "code": "P_CONVERSATION_LOG_EX_EMAILS_T"},
    {"title": "Copy of Commission Check", "forms": "Closing Documents", "req": true, "code": "P_COPY_OF_COMMISSION_CHECK"},
    {"title": "MLS Sold Printout", "forms": "Closing Documents", "req": true, "code": "P_MLS_SOLD_PRINTOUT"}
  ],
  // C.A.R. 'Residential Sales 1-4 Units' checklist (buyer side, items 1-70).
  purchase_buyer: [
    {"title": "Buyer Representation Broker Compensation - BRBC", "forms": "Buyer Representation", "req": true, "code": "P_BUYER_REPRESENTATION_BROKER_"},
    {"title": "Buyer Fin/Pers Info and/or Prefs - BFPI/BIPP", "forms": "Buyer Representation · optional", "code": "P_BUYER_FIN_PERS_INFO_AND_OR_P"},
    {"title": "Modification of Terms (Buyer) - MTBR", "forms": "Buyer Representation · optional", "code": "P_MODIFICATION_OF_TERMS_BUYER_"},
    {"title": "MLS Active/Pending", "forms": "Sales Documentation", "req": true, "code": "P_MLS_ACTIVE_PENDING"},
    {"title": "Property Profile", "forms": "Sales Documentation", "req": true, "code": "P_PROPERTY_PROFILE"},
    {"title": "Agency Disclosure - AD for Buyers Agent", "forms": "Sales Documentation", "req": true, "code": "P_AGENCY_DISCLOSURE_AD_FOR_BUY"},
    {"title": "Residential Purchase Agreement - RPA 07/24", "forms": "Sales Documentation", "req": true, "code": "P_RESIDENTIAL_PURCHASE_AGREEME"},
    {"title": "Buyers Investigation Advisory - BIA", "forms": "Sales Documentation", "req": true, "code": "P_BUYERS_INVESTIGATION_ADVISOR"},
    {"title": "Possible Representation of more than 1 B/S - PRBS", "forms": "Sales Documentation", "req": true, "code": "P_POSSIBLE_REPRESENTATION_OF_M"},
    {"title": "Fair Housing and Discrimination Advisory - FHDA", "forms": "Sales Documentation", "req": true, "code": "P_FAIR_HOUSING_AND_DISCRIMINAT"},
    {"title": "Buyers Homeowners Insurance Advisory - BHIA", "forms": "Sales Documentation", "req": true, "code": "P_BUYERS_HOMEOWNERS_INSURANCE_"},
    {"title": "Wire Fraud Advisory -WFA - Signed by All Parties", "forms": "Sales Documentation", "req": true, "code": "P_WIRE_FRAUD_ADVISORY_WFA_SIGN"},
    {"title": "California Consumer Privacy Act Advisory - CCPA", "forms": "Sales Documentation", "req": true, "code": "P_CALIFORNIA_CONSUMER_PRIVACY_"},
    {"title": "FHA/VA Notice & Addendum", "forms": "Sales Documentation · optional", "code": "P_FHA_VA_NOTICE_ADDENDUM"},
    {"title": "Manufactured Home Addendum", "forms": "Sales Documentation", "req": true, "code": "P_MANUFACTURED_HOME_ADDENDUM"},
    {"title": "Counter Offers/Addendums", "forms": "Sales Documentation · optional", "code": "P_COUNTER_OFFERS_ADDENDUMS"},
    {"title": "Cancellation of Contract & Release of Deposit", "forms": "Required to request cancellation", "code": "CANCEL_CONTRACT", "cancel": true},
    {"title": "Escrow Acknowledgment of RPA - Page 17", "forms": "Escrow Documentation", "req": true, "code": "P_ESCROW_ACKNOWLEDGMENT_OF_RPA"},
    {"title": "Escrow Receipt of Earnest Money Deposit - EMD", "forms": "Escrow Documentation", "req": true, "code": "P_ESCROW_RECEIPT_OF_EARNEST_MO"},
    {"title": "Escrow Instructions", "forms": "Escrow Documentation", "req": true, "code": "P_ESCROW_INSTRUCTIONS"},
    {"title": "Escrow Amendments", "forms": "Escrow Documentation · optional", "code": "P_ESCROW_AMENDMENTS"},
    {"title": "Commission Instructions sign by Client and Broker", "forms": "Escrow Documentation", "req": true, "code": "P_COMMISSION_INSTRUCTIONS_SIGN"},
    {"title": "Statement of Affiliated Services -InHouse Escrow", "forms": "Escrow Documentation · optional", "code": "P_STATEMENT_OF_AFFILIATED_SERV"},
    {"title": "Affidvt of NonForeign- AS/Sellers FIRPTA 1 or QA 1", "forms": "Escrow Documentation", "req": true, "code": "P_AFFIDVT_OF_NONFOREIGN_AS_SEL"},
    {"title": "Real Estate Transfer Disclosure - TDS", "forms": "Disclosures", "req": true, "code": "P_REAL_ESTATE_TRANSFER_DISCLOS"},
    {"title": "Seller Property Questionnaire or ESD - SPQ", "forms": "Disclosures", "req": true, "code": "P_SELLER_PROPERTY_QUESTIONNAIR"},
    {"title": "Agent Visual Inspection Disc. - ENESMA Realty Agent", "forms": "Disclosures", "req": true, "code": "P_AGENT_VISUAL_INSPECTION_DISC"},
    {"title": "Agent Visual Inspection Disc. - Coop Agent", "forms": "Disclosures", "req": true, "code": "P_AGENT_VISUAL_INSPECTION_DISCX"},
    {"title": "Statewide Buyer and Seller Advisory - SBSA", "forms": "Disclosures", "req": true, "code": "P_STATEWIDE_BUYER_AND_SELLER_A"},
    {"title": "Market Conditions Advisory - MCA", "forms": "Disclosures", "req": true, "code": "P_MARKET_CONDITIONS_ADVISORY_M"},
    {"title": "Water Conserving Fixtures/Carbon Monoxide- WCMD", "forms": "Disclosures", "req": true, "code": "P_WATER_CONSERVING_FIXTURES_CA"},
    {"title": "Square Footage and Lot Size Advisory - SFLS", "forms": "Disclosures", "req": true, "code": "P_SQUARE_FOOTAGE_AND_LOT_SIZE_"},
    {"title": "Environmental Hazards/Lead/Mold Booklet Receipt", "forms": "Disclosures", "req": true, "code": "P_ENVIRONMENTAL_HAZARDS_LEAD_M"},
    {"title": "Wildfire Disaster Advisory - If Area w Prior Fires", "forms": "Disclosures", "req": true, "code": "P_WILDFIRE_DISASTER_ADVISORY_I"},
    {"title": "Fire Hardening and Defensible Space Advisory -FHDS", "forms": "Disclosures", "req": true, "code": "P_FIRE_HARDENING_AND_DEFENSIBL"},
    {"title": "Receipt For Reports - RFR or Receipt of Docs", "forms": "Disclosures · optional", "code": "P_RECEIPT_FOR_REPORTS_RFR_OR_R"},
    {"title": "Home Warranty or Waiver", "forms": "Disclosures", "req": true, "code": "P_HOME_WARRANTY_OR_WAIVER"},
    {"title": "Notice of Your Supplemental Prop Tax Bill - SPT", "forms": "Disclosures", "req": true, "code": "P_NOTICE_OF_YOUR_SUPPLEMENTAL_"},
    {"title": "For Your Protection Get a Home Inspection - HID (For FHA/VA)", "forms": "Disclosures · optional", "code": "P_FOR_YOUR_PROTECTION_GET_A_HO"},
    {"title": "Lead-Base Paint Hazards Disclosure- Before 1978", "forms": "Disclosures · optional", "code": "P_LEAD_BASE_PAINT_HAZARDS_DISC"},
    {"title": "Water Heater and Smoke Detector - WHS If No TDS", "forms": "Disclosures · optional", "code": "P_WATER_HEATER_AND_SMOKE_DETEC"},
    {"title": "Earthquake Hazards Report Signed by All Pre-1960", "forms": "Disclosures · optional", "code": "P_EARTHQUAKE_HAZARDS_REPORT_SI"},
    {"title": "Notice to Perform / Demand to Close Escrow -NBP,NSP,DCE", "forms": "Disclosures · optional", "code": "P_NOTICE_TO_PERFORM_DEMAND_TO_"},
    {"title": "Request For Repairs & Response (RR & RRRR)", "forms": "Disclosures · optional", "code": "P_REQUEST_FOR_REPAIRS_RESPONSE"},
    {"title": "Contingency Removals - CR", "forms": "Disclosures · optional", "code": "P_CONTINGENCY_REMOVALS_CR"},
    {"title": "Solar Advisory and Questionnaire", "forms": "Disclosures · optional", "code": "P_SOLAR_ADVISORY_AND_QUESTIONN"},
    {"title": "Extension of Time- ETA", "forms": "Disclosures · optional", "code": "P_EXTENSION_OF_TIME_ETA"},
    {"title": "Seller to Remain in Possession - SIP", "forms": "Disclosures · optional", "code": "P_SELLER_TO_REMAIN_IN_POSSESSI"},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC1", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC2", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC3", "misc": true},
    {"title": "Misc", "forms": "Rename to what you uploaded", "code": "P_MISC4", "misc": true},
    {"title": "Preliminary Title Report", "forms": "Reports and Invoices", "req": true, "code": "P_PRELIMINARY_TITLE_REPORT"},
    {"title": "Preliminary Title Report - Approval by Buyer", "forms": "Reports and Invoices", "req": true, "code": "P_PRELIMINARY_TITLE_REPORT_APP"},
    {"title": "Termite Report or BIW", "forms": "Reports and Invoices", "req": true, "code": "P_TERMITE_REPORT_OR_BIW"},
    {"title": "Termite Report Clearance signed by Buyer", "forms": "Reports and Invoices", "req": true, "code": "P_TERMITE_REPORT_CLEARANCE_SIG"},
    {"title": "Property Inspection Report or BIW", "forms": "Reports and Invoices", "req": true, "code": "P_PROPERTY_INSPECTION_REPORT_O"},
    {"title": "NHD Report", "forms": "Reports and Invoices", "req": true, "code": "P_NHD_REPORT"},
    {"title": "NHD Receipt Signed by ALL parties", "forms": "Reports and Invoices", "req": true, "code": "P_NHD_RECEIPT_SIGNED_BY_ALL_PA"},
    {"title": "Appraisal Report", "forms": "Reports and Invoices · optional", "code": "P_APPRAISAL_REPORT"},
    {"title": "CCRS & HOA Signed Receipt", "forms": "Reports and Invoices · optional", "code": "P_CCRS_HOA_SIGNED_RECEIPT"},
    {"title": "Additional Reports", "forms": "Reports and Invoices · optional", "code": "P_ADDITIONAL_REPORTS"},
    {"title": "Invoices", "forms": "Reports and Invoices · optional", "code": "P_INVOICES"},
    {"title": "Referral Fee Agreement -RFA", "forms": "Reports and Invoices · optional", "code": "P_REFERRAL_FEE_AGREEMENT_RFA"},
    {"title": "CDA - Commission Disbursement Authorization", "forms": "Reports and Invoices · optional", "code": "P_CDA_COMMISSION_DISBURSEMENT_"},
    {"title": "Verification of Property Condition - VP", "forms": "Closing Documents", "req": true, "code": "P_VERIFICATION_OF_PROPERTY_CON"},
    {"title": "Closing Statement", "forms": "Closing Documents", "req": true, "code": "P_CLOSING_STATEMENT"},
    {"title": "Conversation Log - ex. Emails, Text Messages", "forms": "Closing Documents", "req": true, "code": "P_CONVERSATION_LOG_EX_EMAILS_T"},
    {"title": "Copy of Commission Check", "forms": "Closing Documents", "req": true, "code": "P_COPY_OF_COMMISSION_CHECK"},
    {"title": "MLS Sold Printout", "forms": "Closing Documents", "req": true, "code": "P_MLS_SOLD_PRINTOUT"}
  ],
  lease_listing: [
    { code: 'LISTING', title: 'Listing', forms: 'LL · Lease Listing Agreement', req: true },
    { code: 'AD_L', title: 'Disclosure Regarding Real Estate Agency Relationship', forms: 'AD', req: true },
    { code: 'FHDA_L', title: 'Fair Housing & Discrimination Advisory', forms: 'FHDA', req: true },
    { code: 'WFA_L', title: 'Wire Fraud and Electronic Funds Transfer Advisory', forms: 'WFA', req: true },
    { code: 'FLD_L', title: 'Lead-Based Paint Disclosure (pre-1978 homes)', forms: 'FLD', req: false },
    { code: 'MISC_L1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_L2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_LISTING', title: 'Cancellation of Listing', forms: 'CL · Required to request cancellation', req: false, cancel: true }
  ],
  // Added when a lease listing converts to a lease (tenant found), or used for a lease we start on the landlord side.
  lease_landlord: [
    { code: 'LR', title: 'Residential Lease or Month-to-Month Rental Agreement', forms: 'LR', req: true },
    { code: 'LRA', title: 'Application to Rent & Screening', forms: 'LRA', req: true },
    { code: 'MIMO', title: 'Move In / Move Out Inspection', forms: 'MIMO', req: true },
    { code: 'BBD', title: 'Bed Bug Disclosure', forms: 'BBD', req: true },
    { code: 'LEASE_ADD', title: 'Lease Addenda', forms: 'ADM · Pet, parking or HOA addenda', req: false },
    { code: 'DEPOSIT', title: 'Security Deposit / Move-In Funds Receipt', forms: 'Receipt', req: true },
    { code: 'CDA', title: 'Commission Instructions', forms: 'CDA', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_P2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Contract', forms: 'CC · Required to request cancellation', req: false, cancel: true }
  ],
  // Lease where we represent the tenant.
  lease_tenant: [
    { code: 'AD_B', title: 'Disclosure Regarding Real Estate Agency Relationship', forms: 'AD', req: true },
    { code: 'FHDA_B', title: 'Fair Housing & Discrimination Advisory', forms: 'FHDA', req: true },
    { code: 'WFA_B', title: 'Wire Fraud and Electronic Funds Transfer Advisory', forms: 'WFA', req: true },
    { code: 'LRA', title: 'Application to Rent & Screening', forms: 'LRA', req: true },
    { code: 'LR', title: 'Residential Lease or Month-to-Month Rental Agreement', forms: 'LR', req: true },
    { code: 'MIMO', title: 'Move In / Move Out Inspection', forms: 'MIMO', req: true },
    { code: 'BBD', title: 'Bed Bug Disclosure', forms: 'BBD', req: true },
    { code: 'FLD_B', title: 'Lead-Based Paint Disclosure (pre-1978 homes)', forms: 'FLD', req: false },
    { code: 'CDA', title: 'Commission Instructions', forms: 'CDA', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_P2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Contract', forms: 'CC · Required to request cancellation', req: false, cancel: true }
  ],
  referral: [
    { code: 'RFA', title: 'Referral Agreement', forms: 'RFA · Signed by both brokers', req: true },
    { code: 'REF_CLIENT', title: 'Client Contact / Introduction Confirmation', forms: 'Email or signed intro', req: false },
    { code: 'REF_CLOSE', title: 'Proof of Close', forms: 'Closing statement or receiving broker confirmation', req: true },
    { code: 'CDA', title: 'Commission Instructions / Referral Fee Invoice', forms: 'CDA · Invoice', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Referral', forms: 'Written cancellation · Required to request cancellation', req: false, cancel: true }
  ]
};

/** Which template groups apply for a type/side. Order matters: first group's items come first. */
function checklistGroups_(type, side) {
  if (type === 'listing') return ['listing'];
  if (type === 'purchase') {
    if (side === 'seller') return ['listing', 'purchase_seller'];
    if (side === 'both') return ['listing', 'purchase_buyer'];
    return ['purchase_buyer'];
  }
  if (type === 'lease_listing') return ['lease_listing'];
  if (type === 'lease') {
    if (side === 'landlord') return ['lease_listing', 'lease_landlord'];
    if (side === 'both') return ['lease_listing', 'lease_tenant'];
    return ['lease_tenant'];
  }
  if (type === 'referral') return ['referral'];
  throw new Error('Unknown transaction type');
}

/** Flattened template list for a type/side, de-duplicated by code; a later CANCEL_CONTRACT replaces CANCEL_LISTING. */
function checklistTemplate_(type, side) {
  var groups = checklistGroups_(type, side), out = [], seen = {};
  groups.forEach(function (g) {
    CHECKLISTS[g].forEach(function (it) {
      if (seen[it.code]) return;
      seen[it.code] = true;
      var copy = {}; for (var k in it) copy[k] = it[k];
      copy.phase = g;
      out.push(copy);
    });
  });
  // Cancellation items always go at the very end of the checklist
  return out.filter(function (x) { return !x.cancel; }).concat(out.filter(function (x) { return x.cancel; }));
}

/** Intake field definitions (server-side validation; the frontend renders the same keys). */
var INTAKE_REQUIRED = {
  listing: ['address', 'city', 'zip', 'listingDate', 'expirationDate', 'listPrice', 'sellers', 'listingCommission'],
  purchase: ['address', 'city', 'zip', 'side', 'contractDate', 'estCloseDate', 'purchasePrice', 'buyers', 'sellers', 'escrowCompany', 'commission'],
  lease_listing: ['address', 'city', 'zip', 'listingDate', 'expirationDate', 'monthlyRent', 'landlords', 'listingCommission'],
  lease: ['address', 'city', 'zip', 'side', 'leaseStart', 'monthlyRent', 'landlords', 'tenants', 'commission'],
  referral: ['clientName', 'referredTo', 'referralFee', 'location']
};

var TYPE_LABELS = { listing: 'Listing', purchase: 'Purchase', lease_listing: 'Lease Listing', lease: 'Lease', referral: 'Referral' };
var STATUSES = ['Active', 'In Escrow', 'Closed', 'Expired Contract', 'Cancelled'];
function Fail(msg, code) { var e = new Error(msg); e.code = code || 'ERR'; e.tc = true; throw e; }
var seq = 100;
function nid(p) { return p + (++seq).toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }
function now() { return new Date().toISOString(); }
function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function day(n) { return daysAgo(-n).slice(0, 10); }
function addYears(iso, y) { var d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setFullYear(d.getFullYear() + y); return d.toISOString().slice(0, 10); }
function num(v) { return Number(String(v || '').replace(/[^0-9.]/g, '')) || 0; }
function names(a) { return (a || []).map(function (p) { return p.name; }).join(', '); }
var PDF_B64 = 'JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNTk+PnN0cmVhbQpCVCAvRjEgMjQgVGYgNzIgNzAwIFRkIChEZW1vIGRvY3VtZW50IC0gc2FtcGxlIG9ubHkpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK';

var DB = { users: [], txns: [], items: [], docs: [], notes: [], audit: [], sessions: {} };
DB.users.push({ id: 'U1', username: 'admin@demo.test', pw: 'demo', name: 'Enrique Esparza', firstName: 'Enrique', lastName: 'Esparza', email: 'admin@demo.test', phone: '', role: 'admin', owner: true, active: true, mustChange: false, lastLogin: daysAgo(1), locked: false });
DB.users.push({ id: 'U2', username: 'agent@demo.test', pw: 'demo', name: 'Alex Rivera', firstName: 'Alex', lastName: 'Rivera', email: 'agent@demo.test', phone: '', role: 'agent', owner: false, active: true, mustChange: false, lastLogin: daysAgo(2), locked: false });
DB.users.push({ id: 'U3', username: 'sample@demo.test', pw: '', name: 'Sample Agent', firstName: 'Sample', lastName: 'Agent', email: 'sample@demo.test', phone: '', role: 'agent', owner: false, active: true, mustChange: true, lastLogin: '', locked: false });

function user(id) { return DB.users.filter(function (u) { return u.id === id; })[0]; }
function mName(v, label) { var s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim(); if (!s) Fail(label + ' is required.'); if (s.length > 50) Fail(label + ' must be 50 characters or fewer.'); return s; }
function pub(u) { return { id: u.id, username: u.username, name: u.name, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email, role: u.role, owner: !!u.owner, mustChange: !!u.mustChange }; }
function txn(id) { return DB.txns.filter(function (t) { return t.id === id; })[0]; }
function itemsOf(id) { return DB.items.filter(function (i) { return i.txnId === id; }); }
function docsOfItem(id) { return DB.docs.filter(function (d) { return d.itemId === id && !d.removed; }); }
function isFinal(t) { return t.status === 'Closed' || t.status === 'Cancelled'; }
function audit(t, by, action) { DB.audit.push({ txnId: t, ts: now(), by: by, action: action }); }
function addItems(t) {
  var have = {}; itemsOf(t.id).forEach(function (i) { have[i.code] = i; });
  var tpl = checklistTemplate_(t.type, t.side), added = 0, codes = {};
  tpl.forEach(function (x) {
    codes[x.code] = 1;
    if (have[x.code]) { have[x.code].active = true; return; }
    DB.items.push({ id: nid('I'), txnId: t.id, code: x.code, title: x.title, customTitle: '', forms: x.forms, phase: x.phase, req: !!x.req, misc: !!x.misc, cancel: !!x.cancel, active: true, status: 'Missing', reviewNote: '', reviewedAt: '' });
    added++;
  });
  itemsOf(t.id).forEach(function (i) { if (!codes[i.code]) i.active = false; });
  return added;
}
function recompute(i) {
  var docs = docsOfItem(i.id), s = 'Missing';
  if (docs.length) {
    if (docs.some(function (d) { return d.status === 'Pending'; })) s = 'Pending';
    else { var r = docs.filter(function (d) { return d.reviewedAt; }).sort(function (a, b) { return String(b.reviewedAt).localeCompare(String(a.reviewedAt)); }); s = r.length ? r[0].status : 'Pending'; }
  }
  i.status = s;
}
function progress(items) {
  var p = { required: 0, approved: 0, rejected: 0, pending: 0 };
  items.forEach(function (i) { if (!i.active) return; if (i.status === 'Rejected') p.rejected++; if (i.status === 'Pending') p.pending++; if (i.req) { p.required++; if (i.status === 'Approved') p.approved++; } });
  return p;
}
function title(t) { return t.address ? t.address + (t.city ? ', ' + t.city : '') : 'Referral – ' + ((t.intake || {}).clientName || ''); }
function clientLine(t) {
  var i = t.intake || {};
  if (t.type === 'listing') return 'Sellers: ' + names(i.sellers);
  if (t.type === 'purchase') return t.side === 'seller' ? 'Sellers: ' + names(i.sellers) : 'Buyers: ' + names(i.buyers);
  if (t.type === 'lease_listing') return 'Landlords: ' + names(i.landlords);
  if (t.type === 'lease') return t.side === 'landlord' ? 'Landlords: ' + names(i.landlords) : 'Tenants: ' + names(i.tenants);
  return 'Client: ' + (i.clientName || '');
}
function keyDate(t) {
  var i = t.intake || {};
  if (t.status === 'Closed') return 'Closed ' + String(t.closedAt).slice(0, 10);
  if (t.status === 'Cancelled') return 'Cancelled ' + String(t.cancelledAt).slice(0, 10);
  if (t.type === 'listing' || t.type === 'lease_listing') return 'Expires ' + (i.expirationDate || '');
  if (t.type === 'purchase') return 'Est. close ' + (i.estCloseDate || '');
  if (t.type === 'lease') return 'Lease start ' + (i.leaseStart || '');
  return 'Est. close ' + (i.expectedClose || '');
}
function summary(t) {
  return { id: t.id, type: t.type, typeLabel: TYPE_LABELS[t.type], side: t.side, status: t.status, title: title(t), clients: clientLine(t), keyDate: keyDate(t),
    agentName: (user(t.agentId) || {}).name, agentId: t.agentId, progress: progress(itemsOf(t.id)), cancelPending: !!(t.cancelRequest && t.cancelRequest.state === 'pending'), updatedAt: t.updatedAt, escrowNumber: (t.intake || {}).escrowNumber || '' };
}
function relistQ(t) { return (t.type === 'purchase' && t.side !== 'buyer') || (t.type === 'lease' && t.side !== 'tenant'); }
function validSide(type, side) {
  if (type === 'purchase') return ['buyer', 'seller', 'both'].indexOf(side) >= 0 ? side : Fail('Choose who we represent.', 'INTAKE');
  if (type === 'lease') return ['tenant', 'landlord', 'both'].indexOf(side) >= 0 ? side : Fail('Choose who we represent.', 'INTAKE');
  return type === 'listing' ? 'seller' : type === 'lease_listing' ? 'landlord' : 'referral';
}
function requireIntake(type, intake) {
  var miss = INTAKE_REQUIRED[type].filter(function (k) { var v = intake[k]; return Array.isArray(v) ? !v.length : !String(v || '').trim(); });
  if (miss.length) Fail('Please complete: ' + miss.join(', '), 'INTAKE');
}
function mkTxn(type, intake, agentId, extra) {
  intake.side = validSide(type, intake.side);
  var t = Object.assign({ id: nid('T'), type: type, side: intake.side, status: (type === 'purchase' || type === 'lease') ? 'In Escrow' : 'Active', agentId: agentId, address: intake.address || '', city: intake.city || '', zip: intake.zip || '',
    intake: intake, parentId: '', childId: '', convertedFrom: '', cancelRequest: null, createdAt: now(), updatedAt: now(), closedAt: '', cancelledAt: '', retentionUntil: '' }, extra || {});
  DB.txns.push(t); addItems(t); return t;
}
function addDoc(t, item, name, by, status, extra) {
  var d = Object.assign({ id: nid('D'), txnId: t.id, itemId: item ? item.id : '', name: name, mime: 'application/pdf', size: 1024, pages: 1, kind: 'file', sourceDocId: '', pageRange: '', status: item ? (status || 'Pending') : 'Stored',
    uploadedBy: by, uploadedAt: now(), reviewNote: '', reviewedAt: status === 'Approved' || status === 'Rejected' ? now() : '', removed: false, removedAt: '', removedBy: '', removeReason: '', purgeStatus: '', b64: PDF_B64 }, extra || {});
  DB.docs.push(d); if (item) recompute(item); return d;
}
function seedApprove(t, n, by) { itemsOf(t.id).filter(function (i) { return i.active && i.req; }).slice(0, n).forEach(function (i) { addDoc(t, i, i.title + '.pdf', by, 'Approved'); }); }
function P(n, ph, em) { return { name: n, phone: ph || '', email: em || '' }; }
(function seed() {
  var a = mkTxn('listing', { address: '1420 Vista Del Mar', city: 'Riverside', zip: '92506', propertyType: 'Single Family', listingDate: day(-20), expirationDate: day(160), listPrice: '849000', sellers: [P('Maria Lopez', '951-555-0101')], listingCommission: '2.5', listingCommissionType: 'percent', mlsNumber: 'IV26100001' }, 'U2');
  seedApprove(a, 6, 'U2');
  var it = itemsOf(a.id); addDoc(a, it[6], 'Seller questionnaire signed.pdf', 'U2', 'Pending');
  var rj = it[7]; var rd = addDoc(a, rj, 'Disclosure.pdf', 'U2', 'Rejected'); rd.reviewNote = 'Page 3 is missing the seller initials.'; recompute(rj); rj.reviewNote = rd.reviewNote;
  DB.notes.push({ id: nid('N'), txnId: a.id, itemId: rj.id, userId: 'U1', kind: 'rejection', text: 'Page 3 is missing the seller initials.', createdAt: daysAgo(1) });
  addDoc(a, null, 'Listing packet (full).pdf', 'U2', '', { kind: 'packet', pages: 14 });
  var b = mkTxn('purchase', { address: '88 Canyon Crest Dr', city: 'Corona', zip: '92882', side: 'buyer', contractDate: day(-12), estCloseDate: day(18), purchasePrice: '615000', buyers: [P('James & Ana Rivera')], sellers: [P('Owner of record')], escrowCompany: 'Inland Escrow', escrowNumber: 'IE-44821', commission: '2.5', commissionType: 'percent' }, 'U2');
  seedApprove(b, 9, 'U2'); addDoc(b, itemsOf(b.id)[9], 'Inspection report.pdf', 'U2', 'Pending');
  var c = mkTxn('purchase', { address: '3021 Mission Inn Ave', city: 'Riverside', zip: '92507', side: 'seller', contractDate: day(-50), estCloseDate: day(-20), purchasePrice: '730000', finalPrice: '725000', buyers: [P('K. Nguyen')], sellers: [P('Robert Hall')], escrowCompany: 'Inland Escrow', commission: '2.5', commissionType: 'percent' }, 'U1', { status: 'Closed', closedAt: day(-20), retentionUntil: addYears(day(-20), 7) });
  seedApprove(c, 40, 'U1');
  var d = mkTxn('purchase', { address: '9 Orchard Ln', city: 'Fontana', zip: '92335', side: 'both', contractDate: day(-140), estCloseDate: day(-110), purchasePrice: '540000', finalPrice: '540000', buyers: [P('L. Chen')], sellers: [P('S. Patel')], escrowCompany: 'First Escrow', commission: '5', commissionType: 'percent' }, 'U2', { status: 'Closed', closedAt: day(-110), retentionUntil: addYears(day(-110), 7) });
  seedApprove(d, 40, 'U2');
  var e = mkTxn('purchase', { address: '510 Lemon St', city: 'Riverside', zip: '92501', side: 'buyer', contractDate: day(-260), estCloseDate: day(-230), purchasePrice: '480000', finalPrice: '475000', buyers: [P('D. Morales')], sellers: [P('T. King')], escrowCompany: 'Inland Escrow', commission: '2.5', commissionType: 'percent' }, 'U1', { status: 'Closed', closedAt: day(-230), retentionUntil: addYears(day(-230), 7) });
  seedApprove(e, 40, 'U1');
  var f = mkTxn('lease_listing', { address: '77 Magnolia Ave #4', city: 'Riverside', zip: '92506', listingDate: day(-8), expirationDate: day(80), monthlyRent: '2400', landlords: [P('Westside Holdings LLC')], listingCommission: '2400', listingCommissionType: 'amount' }, 'U2');
  seedApprove(f, 2, 'U2');
  var g = mkTxn('lease', { address: '12 Arlington Ave', city: 'Riverside', zip: '92503', side: 'landlord', leaseStart: day(-30), monthlyRent: '2900', landlords: [P('A. Gomez')], tenants: [P('M. Brooks')], commission: '2900', commissionType: 'amount' }, 'U1', { status: 'Closed', closedAt: day(-30), retentionUntil: addYears(day(-30), 7) });
  seedApprove(g, 40, 'U1');
  var hh = mkTxn('referral', { clientName: 'Paula Diaz', referredTo: 'Agent in Phoenix, AZ', referralFee: '25%', location: 'Phoenix, AZ', expectedClose: day(45) }, 'U2');
  var i2 = mkTxn('listing', { address: '450 Palm Dr', city: 'Moreno Valley', zip: '92553', listingDate: day(-200), expirationDate: day(-20), listPrice: '520000', sellers: [P('Grace Kim')], listingCommission: '2.5', listingCommissionType: 'percent' }, 'U1', { status: 'Expired Contract', retentionUntil: addYears(day(-20), 7) });
  seedApprove(i2, 5, 'U1');
  var j = mkTxn('purchase', { address: '2205 Sunset Ridge', city: 'Norco', zip: '92860', side: 'seller', contractDate: day(-6), estCloseDate: day(24), purchasePrice: '1150000', buyers: [P('B. Allen')], sellers: [P('C. Ortiz')], escrowCompany: 'First Escrow', commission: '2', commissionType: 'percent' }, 'U2', { convertedFrom: 'listing' });
  seedApprove(j, 12, 'U2');
  var ci = itemsOf(j.id).filter(function (x) { return x.cancel && x.active; })[0]; addDoc(j, ci, 'Cancellation of Contract signed.pdf', 'U2', 'Pending');
  j.cancelRequest = { state: 'pending', requestedAt: daysAgo(0), requestedBy: 'U2', requestedByName: 'Zina (sample agent)', reason: 'Buyer could not qualify for the loan.', relist: true };
  DB.txns.forEach(function (t, k) { t.updatedAt = daysAgo(k); audit(t.id, (user(t.agentId) || {}).username, 'transaction_created'); });
})();
function access(u, id) { var t = txn(id); if (!t || (u.role !== 'admin' && t.agentId !== u.id)) Fail('Transaction not found.'); return t; }
function needAdmin(u) { if (u.role !== 'admin') Fail('Admins only.', 'FORBIDDEN'); }
function touch(t) { t.updatedAt = now(); }
var A = {};
A.ping = function () { return { pong: true }; };
A.login = function (b) {
  var e = String(b.email || b.username || '').trim().toLowerCase(); if (e === 'admin' || e === 'agent') e += '@demo.test';
  var u = DB.users.filter(function (x) { return x.username === e; })[0];
  // Same rules as the live backend: one generic message, and 5 misses lock the email for 15 minutes.
  DB.fails = DB.fails || {}; var f = DB.fails[e] || { n: 0, until: 0 };
  if (f.until > Date.now()) Fail('Too many attempts. Try again in 15 minutes.', 'LOCKED');
  if (!u || !u.pw || u.pw !== b.password || !u.active) {
    f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60 * 1000; f.n = 0; if (u) u.locked = true; } DB.fails[e] = f;
    Fail('Invalid email or password.');
  }
  delete DB.fails[e]; u.locked = false;
  var tok = nid('S') + nid('S'); DB.sessions[tok] = u.id; u.lastLogin = now();
  return { token: tok, user: pub(u) };
};
A.requestPasswordCode = function (b) {
  var e = String(b.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) Fail('Enter your email address.');
  DB.codes = DB.codes || {}; DB.codes[e] = '123456'; return { sent: true, demoCode: '123456' };
};
A.resetPasswordWithCode = function (b) {
  var e = String(b.email || '').trim().toLowerCase(), u = DB.users.filter(function (x) { return x.username === e && x.active; })[0];
  if (!u || !DB.codes || DB.codes[e] !== String(b.code || '').trim()) Fail('That code is invalid or expired. Request a new one. (Demo code: 123456)');
  var p = String(b.newPassword || ''); if (p.length < 10 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) Fail('Use at least 10 characters with letters and numbers.');
  u.pw = p; u.mustChange = false; delete DB.codes[e];
  var tok = nid('S') + nid('S'); DB.sessions[tok] = u.id; u.lastLogin = now(); return { token: tok, user: pub(u) };
};
A.logout = function (b) { delete DB.sessions[b.token]; return {}; };
A.me = function (b, u) { return { user: pub(u) }; };
A.changePassword = function (b, u) {
  if (b.current !== u.pw) Fail('Your current password is not correct.');
  var p = String(b.newPassword || ''); if (p.length < 10 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) Fail('Use at least 10 characters with letters and numbers.');
  u.pw = p; u.mustChange = false;
  Object.keys(DB.sessions).forEach(function (t) { if (DB.sessions[t] === u.id) delete DB.sessions[t]; }); // sign out everywhere
  var tok = nid('S') + nid('S'); DB.sessions[tok] = u.id; return { user: pub(u), token: tok };
};
A.listUsers = function (b, u) { needAdmin(u); return DB.users.map(function (x) { return { id: x.id, username: x.username, name: x.name, firstName: x.firstName || '', lastName: x.lastName || '', email: x.email, phone: x.phone, role: x.role, owner: !!x.owner, active: x.active, mustChange: x.mustChange, lastLogin: x.lastLogin, locked: x.locked }; }); };
A.createUser = function (b, u) {
  needAdmin(u); var em = String(b.email || b.username || '').trim().toLowerCase();
  var fn = mName(b.firstName, 'First name'), ln = mName(b.lastName, 'Last name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) Fail('Enter a valid email.');
  if (DB.users.some(function (x) { return x.username === em; })) Fail('A user with that email already exists.');
  var nu = { id: nid('U'), username: em, pw: '', name: fn + ' ' + ln, firstName: fn, lastName: ln, email: em, phone: b.phone || '', role: 'agent', owner: false, active: true, mustChange: true, lastLogin: '', locked: false };
  DB.users.push(nu);
  if (b.splitPct !== undefined && b.splitPct !== '') saveSplit(nu.id, b);
  return { user: pub(nu), tempPassword: '' };
};
A.updateUser = function (b, u) { needAdmin(u); var x = user(b.userId); if (!x) Fail('User not found.'); if (x.owner && !u.owner) Fail('Only the owner can edit this account.');
  var fn = mName(b.firstName, 'First name'), ln = mName(b.lastName, 'Last name'); x.firstName = fn; x.lastName = ln; x.name = fn + ' ' + ln; if (b.phone !== undefined) x.phone = String(b.phone).slice(0, 40);
  return { user: A.listUsers({}, u).filter(function (y) { return y.id === x.id; })[0] }; };
A.resetPassword = function (b, u) { needAdmin(u); var x = user(b.userId); if (!x) Fail('User not found.'); if (x.owner && !u.owner) Fail('Only the owner can reset this account.'); x.pw = ''; x.mustChange = true; x.locked = false;
  Object.keys(DB.sessions).forEach(function (t) { if (DB.sessions[t] === x.id) delete DB.sessions[t]; });
  DB.codes = DB.codes || {}; DB.codes[x.username] = '123456'; return { emailed: true, tempPassword: '' }; };
A.setUserActive = function (b, u) { needAdmin(u); var x = user(b.userId); if (!x || x.owner) Fail('Cannot change this user.'); x.active = !!b.active; return {}; };
A.createTransaction = function (b, u) {
  if (!TYPE_LABELS[b.type]) Fail('Choose a transaction type.');
  var intake = Object.assign({}, b.intake || {}); intake.side = validSide(b.type, intake.side); requireIntake(b.type, intake);
  var agentId = (b.agentId && u.role === 'admin') ? b.agentId : u.id;
  var t = mkTxn(b.type, intake, agentId); audit(t.id, u.username, 'transaction_created'); return { id: t.id };
};
A.updateIntake = function (b, u) {
  var t = access(u, b.id); if (isFinal(t) && u.role !== 'admin') Fail('This file is ' + t.status + '.');
  var intake = Object.assign({}, t.intake, b.intake || {}); intake.side = t.side; requireIntake(t.type, intake);
  t.intake = intake; t.address = intake.address || t.address; t.city = intake.city || t.city; t.zip = intake.zip || t.zip; touch(t); audit(t.id, u.username, 'intake_updated'); return {};
};
A.convert = function (b, u) {
  var t = access(u, b.id), to = { listing: 'purchase', lease_listing: 'lease' }[t.type];
  if (!to) Fail('Only listings and lease listings can be converted.'); if (isFinal(t)) Fail('This file is ' + t.status + '.');
  if (t.cancelRequest && t.cancelRequest.state === 'pending') Fail('A cancellation request is pending on this file.');
  var intake = Object.assign({}, t.intake, b.intake || {}), side = b.side || intake.side;
  side = to === 'purchase' ? (side === 'both' ? 'both' : 'seller') : (side === 'both' ? 'both' : 'landlord'); intake.side = side; requireIntake(to, intake);
  var from = t.type; Object.assign(t, { type: to, side: side, status: 'In Escrow', intake: intake, convertedFrom: from, address: intake.address, city: intake.city, zip: intake.zip }); touch(t);
  var added = addItems(t); audit(t.id, u.username, to === 'purchase' ? 'accepted_contract' : 'converted'); return { id: t.id, added: added };
};
A.dashboard = function (b, u) {
  var scope = u.role === 'admin' && b.scope === 'company' ? 'company' : 'personal';
  var list = DB.txns.filter(function (t) { return scope === 'company' || t.agentId === u.id; });
  var counts = { listings: 0, purchases: 0, leaseListings: 0, leases: 0, referrals: 0, Active: 0, 'In Escrow': 0, Closed: 0, 'Expired Contract': 0, Cancelled: 0 };
  var st = { closedCount: 0, sellerSides: 0, buyerSides: 0, sellerVolume: 0, buyerVolume: 0, combinedVolume: 0, leaseCount: 0, referralCount: 0 }, cut = daysAgo(365).slice(0, 10);
  list.forEach(function (t) {
    counts[{ listing: 'listings', purchase: 'purchases', lease_listing: 'leaseListings', lease: 'leases', referral: 'referrals' }[t.type]]++; counts[t.status]++;
    if (t.status === 'Closed' && String(t.closedAt).slice(0, 10) >= cut) {
      st.closedCount++; var p = num(t.intake.finalPrice || t.intake.purchasePrice);
      if (t.type === 'purchase') { if (t.side !== 'buyer') { st.sellerSides++; st.sellerVolume += p; } if (t.side !== 'seller') { st.buyerSides++; st.buyerVolume += p; } }
      else if (t.type === 'lease') st.leaseCount++; else if (t.type === 'referral') st.referralCount++;
    }
  });
  st.combinedVolume = st.sellerVolume + st.buyerVolume;
  var tx = list.slice().sort(function (a, c) { return (isFinal(a) ? 1 : 0) - (isFinal(c) ? 1 : 0) || String(c.updatedAt).localeCompare(String(a.updatedAt)); }).map(summary);
  var pr = 0, cr = 0;
  if (u.role === 'admin') { DB.items.forEach(function (i) { if (i.active && i.status === 'Pending') pr++; }); DB.txns.forEach(function (t) { if (t.cancelRequest && t.cancelRequest.state === 'pending') cr++; }); }
  return { scope: scope, counts: counts, stats: st, transactions: tx, pendingReview: pr, cancelRequests: cr, goals: scope === 'personal' ? { year: '2027', units: 12, volume: 10000000, closedUnits: 5, closedVolume: 4200000, unitsPct: 42, volumePct: 42, rank: 1, rankOf: 2 } : undefined };
};
A.search = function (b, u) {
  var q = String(b.q || '').toLowerCase().trim(); if (q.length < 2) return { results: [] };
  var terms = q.split(/\s+/);
  return { results: DB.txns.filter(function (t) {
    if (u.role !== 'admin' && t.agentId !== u.id) return false;
    var i = t.intake, hay = [t.id, t.address, t.city, t.zip, TYPE_LABELS[t.type], t.status, i.escrowNumber, i.mlsNumber, i.clientName, i.escrowCompany, names(i.sellers), names(i.buyers), names(i.landlords), names(i.tenants), (user(t.agentId) || {}).name].join(' ').toLowerCase();
    return terms.every(function (x) { return hay.indexOf(x) >= 0; });
  }).slice(0, 25).map(summary) };
};
function docOut(d, u) { return { id: d.id, itemId: d.itemId, name: d.name, mime: d.mime, size: d.size, pages: d.pages, kind: d.kind, sourceDocId: d.sourceDocId, pageRange: d.pageRange, status: d.status, uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt, reviewNote: d.reviewNote, reviewedAt: d.reviewedAt, removed: d.removed, removedAt: d.removedAt, removeReason: u.role === 'admin' ? d.removeReason : '', purgeStatus: u.role === 'admin' ? d.purgeStatus : '', uploadedByName: (user(d.uploadedBy) || {}).name }; }
A.getTransaction = function (b, u) {
  var t = access(u, b.id), items = itemsOf(t.id).filter(function (i) { return i.active || u.role === 'admin'; });
  return {
    txn: { id: t.id, type: t.type, typeLabel: TYPE_LABELS[t.type], side: t.side, status: t.status, agentId: t.agentId, agentName: (user(t.agentId) || {}).name, address: t.address, city: t.city, zip: t.zip, intake: t.intake, parentId: t.parentId, childId: t.childId, convertedFrom: t.convertedFrom,
      cancelRequest: t.cancelRequest, createdAt: t.createdAt, updatedAt: t.updatedAt, closedAt: t.closedAt, cancelledAt: t.cancelledAt, retentionUntil: t.retentionUntil, title: title(t), progress: progress(items), relistQuestion: relistQ(t) },
    items: items.map(function (i) { return { id: i.id, code: i.code, title: i.customTitle || i.title, baseTitle: i.title, customTitle: i.customTitle, forms: i.forms, phase: i.phase, req: i.req, misc: i.misc, cancel: i.cancel, active: i.active, status: i.status, reviewNote: i.reviewNote, reviewedAt: i.reviewedAt }; }),
    documents: DB.docs.filter(function (d) { return d.txnId === t.id && (!d.removed || u.role === 'admin'); }).map(function (d) { return docOut(d, u); }),
    notes: DB.notes.filter(function (n) { return n.txnId === t.id; }).map(function (n) { return { id: n.id, itemId: n.itemId, kind: n.kind, text: n.text, createdAt: n.createdAt, by: (user(n.userId) || {}).name }; }),
    activity: DB.audit.filter(function (a) { return a.txnId === t.id; }).slice(-60).reverse()
  };
};
function itemIn(t, id) { if (!id) return null; var i = DB.items.filter(function (x) { return x.id === id && x.txnId === t.id; })[0]; if (!i) Fail('Checklist item not found.'); return i; }
A.upload = function (b, u) {
  var t = access(u, b.txnId); if (isFinal(t) && u.role !== 'admin') Fail('This file is ' + t.status + '.');
  if (!b.base64) Fail('Empty file.'); var size = Math.floor(b.base64.length * 3 / 4); if (size > 20 * 1024 * 1024) Fail('File is larger than 20 MB.');
  var i = itemIn(t, b.itemId);
  var d = addDoc(t, i, String(b.name || 'file').slice(0, 150), u.id, 'Pending', { mime: b.mime || 'application/octet-stream', size: size, b64: b.base64, kind: b.kind || 'file', sourceDocId: b.sourceDocId || '', pageRange: b.pageRange || '', pages: b.pages || '' });
  touch(t); audit(t.id, u.username, 'document_uploaded'); return { doc: docOut(d, u) };
};
A.assignDocument = function (b, u) {
  var d = DB.docs.filter(function (x) { return x.id === b.docId && !x.removed; })[0]; if (!d) Fail('Document not found.');
  var t = access(u, d.txnId); if (isFinal(t) && u.role !== 'admin') Fail('This file is ' + t.status + '.');
  if (u.role !== 'admin' && d.itemId && d.status !== 'Pending') Fail('Reviewed documents can only be moved by an admin.');
  var old = d.itemId ? DB.items.filter(function (x) { return x.id === d.itemId; })[0] : null, tg = itemIn(t, b.itemId);
  Object.assign(d, { itemId: tg ? tg.id : '', status: tg ? 'Pending' : 'Stored', reviewNote: '', reviewedAt: '' });
  if (old) recompute(old); if (tg) recompute(tg); touch(t); audit(t.id, u.username, 'document_assigned'); return {};
};
A.renameMisc = function (b, u) { var i = DB.items.filter(function (x) { return x.id === b.itemId; })[0]; if (!i || !i.misc) Fail('Only Misc items can be renamed.'); access(u, i.txnId); i.customTitle = String(b.title || '').trim().slice(0, 80); return {}; };
A.addNote = function (b, u) { var t = access(u, b.txnId), x = String(b.text || '').trim(); if (!x) Fail('Write a note first.'); DB.notes.push({ id: nid('N'), txnId: t.id, itemId: b.itemId || '', userId: u.id, kind: 'note', text: x, createdAt: now() }); touch(t); return {}; };
A.resubmit = function (b, u) {
  var i = DB.items.filter(function (x) { return x.id === b.itemId; })[0]; if (!i) Fail('Item not found.'); var t = access(u, i.txnId);
  if (i.status !== 'Rejected') Fail('Only rejected items can be resubmitted.'); var x = String(b.note || '').trim(); if (!x) Fail('Add an explanation note for the reviewer.');
  DB.notes.push({ id: nid('N'), txnId: t.id, itemId: i.id, userId: u.id, kind: 'resubmit', text: x, createdAt: now() });
  docsOfItem(i.id).forEach(function (d) { if (d.status === 'Rejected') d.status = 'Pending'; }); recompute(i); touch(t); audit(t.id, u.username, 'item_resubmitted'); return {};
};
A.getFile = function (b, u) { var d = DB.docs.filter(function (x) { return x.id === b.docId; })[0]; if (!d || (d.removed && u.role !== 'admin')) Fail('Document not found.'); access(u, d.txnId); return { name: d.name, mime: d.mime, base64: d.b64 }; };
A.reviewQueue = function (b, u) {
  needAdmin(u);
  var items = DB.items.filter(function (i) { return i.active && i.status === 'Pending'; }).map(function (i) {
    var t = txn(i.txnId), docs = docsOfItem(i.id);
    return { itemId: i.id, itemTitle: i.customTitle || i.title, forms: i.forms, txnId: t.id, txnTitle: title(t), typeLabel: TYPE_LABELS[t.type], agentName: (user(t.agentId) || {}).name,
      submittedAt: docs.reduce(function (m, d) { return d.uploadedAt > m ? d.uploadedAt : m; }, ''), docs: docs.map(function (d) { return { id: d.id, name: d.name, status: d.status, uploadedAt: d.uploadedAt, pageRange: d.pageRange, size: d.size }; }),
      notes: DB.notes.filter(function (n) { return n.itemId === i.id; }).slice(-5).map(function (n) { return { kind: n.kind, text: n.text, by: (user(n.userId) || {}).name, createdAt: n.createdAt }; }) };
  });
  var cancels = DB.txns.filter(function (t) { return t.cancelRequest && t.cancelRequest.state === 'pending'; }).map(function (t) { return { txnId: t.id, title: title(t), typeLabel: TYPE_LABELS[t.type], side: t.side, agentName: (user(t.agentId) || {}).name, request: t.cancelRequest }; });
  return { items: items, cancellations: cancels };
};
A.reviewItem = function (b, u) {
  needAdmin(u); var i = DB.items.filter(function (x) { return x.id === b.itemId; })[0]; if (!i) Fail('Item not found.');
  var dec = b.decision === 'approve' ? 'Approved' : b.decision === 'reject' ? 'Rejected' : Fail('Choose approve or reject.'), note = String(b.note || '').trim();
  if (dec === 'Rejected' && !note) Fail('Add a note explaining what to fix.');
  docsOfItem(i.id).forEach(function (d) { if (d.status === 'Pending') { d.status = dec; d.reviewNote = note; d.reviewedAt = now(); } });
  recompute(i); i.reviewNote = note; i.reviewedAt = now();
  if (note) DB.notes.push({ id: nid('N'), txnId: i.txnId, itemId: i.id, userId: u.id, kind: dec === 'Rejected' ? 'rejection' : 'approval', text: note, createdAt: now() });
  touch(txn(i.txnId)); audit(i.txnId, u.username, dec === 'Approved' ? 'item_approved' : 'item_rejected'); return {};
};
A.removeDocument = function (b, u) {
  needAdmin(u); var d = DB.docs.filter(function (x) { return x.id === b.docId && !x.removed; })[0]; if (!d) Fail('Document not found.');
  var r = String(b.reason || '').trim(); if (!r) Fail('Give a reason for removing this document.');
  Object.assign(d, { removed: true, removedBy: u.id, removedAt: now(), removeReason: r, purgeStatus: 'pending_enrique_approval' });
  if (d.itemId) recompute(DB.items.filter(function (x) { return x.id === d.itemId; })[0]); audit(d.txnId, u.username, 'document_removed'); return {};
};
A.restoreDocument = function (b, u) {
  needAdmin(u); var d = DB.docs.filter(function (x) { return x.id === b.docId && x.removed; })[0]; if (!d) Fail('Document not found.');
  Object.assign(d, { removed: false, removedAt: '', removeReason: '', purgeStatus: '' }); if (d.itemId) recompute(DB.items.filter(function (x) { return x.id === d.itemId; })[0]); audit(d.txnId, u.username, 'document_restored'); return {};
};
A.purgeQueue = function (b, u) { needAdmin(u); return { docs: DB.docs.filter(function (d) { return d.removed; }).map(function (d) { var t = txn(d.txnId); return { id: d.id, name: d.name, txnId: d.txnId, txnTitle: t.address || '', removedAt: d.removedAt, removedBy: (user(d.removedBy) || {}).name, reason: d.removeReason, retentionUntil: t.retentionUntil || '(open file)', purgeStatus: d.purgeStatus }; }) }; };
A.requestCancel = function (b, u) {
  var t = access(u, b.id); if (isFinal(t)) Fail('This file is ' + t.status + '.'); if (t.cancelRequest && t.cancelRequest.state === 'pending') Fail('A cancellation request is already pending.');
  var ci = itemsOf(t.id).filter(function (i) { return i.cancel && i.active; })[0];
  if (!ci || !docsOfItem(ci.id).length) Fail('Upload the signed ' + (ci ? ci.title : 'cancellation') + ' first.', 'CANCEL_DOC_REQUIRED');
  var relist = '';
  if (relistQ(t)) { if (b.relist !== true && b.relist !== false) Fail('Is the property going back on the market?', 'RELIST_REQUIRED'); relist = b.relist; }
  t.cancelRequest = { state: 'pending', requestedAt: now(), requestedBy: u.id, requestedByName: u.name, reason: String(b.reason || '').trim(), relist: relist };
  touch(t); audit(t.id, u.username, 'cancel_requested'); return {};
};
A.decideCancel = function (b, u) {
  needAdmin(u); var t = txn(b.id); if (!t || !t.cancelRequest || t.cancelRequest.state !== 'pending') Fail('No pending cancellation request.');
  var cr = t.cancelRequest; cr.decidedAt = now(); cr.decidedBy = u.name; cr.note = String(b.note || '');
  if (!b.approve) { cr.state = 'denied'; touch(t); audit(t.id, u.username, 'cancel_denied'); return {}; }
  cr.state = 'approved'; t.status = 'Cancelled'; t.cancelledAt = now(); t.retentionUntil = addYears(now(), 7); touch(t); audit(t.id, u.username, 'cancel_approved');
  var newId = '';
  if (cr.relist === true) {
    var nt = t.type === 'lease' ? 'lease_listing' : 'listing', intake = Object.assign({}, t.intake); intake.side = '';
    var n = mkTxn(nt, intake, t.agentId, { parentId: t.id }); t.childId = n.id; newId = n.id;
    var byCode = {}; itemsOf(n.id).forEach(function (i) { byCode[i.code] = i; });
    itemsOf(t.id).forEach(function (oi) { var ni = byCode[oi.code]; if (!ni || oi.cancel || (oi.phase !== 'listing' && oi.phase !== 'lease_listing')) return; docsOfItem(oi.id).forEach(function (d) { addDoc(n, ni, d.name, d.uploadedBy, d.status, { b64: d.b64, mime: d.mime, size: d.size }); }); });
    audit(n.id, u.username, 'relisted_from_cancellation');
  }
  return { relistedId: newId };
};
A.setStatus = function (b, u) {
  needAdmin(u); var t = txn(b.id); if (!t) Fail('Transaction not found.'); var s = String(b.status || '');
  if (['Active', 'In Escrow', 'Closed', 'Expired Contract'].indexOf(s) < 0) Fail(s === 'Cancelled' ? 'Use the cancellation request so the signed cancellation is on file.' : 'Unknown status.');
  if (s === 'Closed') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.closeDate || '')) Fail('Enter the close of escrow date.');
    if (t.type === 'purchase') { var fp = num(b.finalPrice || t.intake.purchasePrice); if (!fp) Fail('Enter the final sales price.'); t.intake.finalPrice = String(fp); }
    t.closedAt = b.closeDate; t.retentionUntil = addYears(b.closeDate, 7);
  } else if (s === 'Expired Contract') t.retentionUntil = addYears(t.intake.expirationDate || now(), 7);
  else { t.closedAt = ''; t.retentionUntil = ''; }
  t.status = s; touch(t); audit(t.id, u.username, 'status_changed'); return {};
};
/* ---- 1.6.0 E-Books (demo): same shapes and the same owner-only rule as EBooks.gs ---- */
var EBD = { cats: [], vendors: [], agents: {}, entries: [] };
(function () {
  var o = 0;
  [['income', ['Commission Income', 'Referral Income', 'Transaction/Admin Fees', 'Other Income']], ['expense', ['Agent Commission Payouts', 'Referral Fees Paid', 'Advertising & Marketing', 'MLS/Association Dues', 'E&O Insurance', 'Office/Rent', 'Software & Subscriptions', 'Licensing & Education', 'Auto', 'Meals', 'Professional Fees', 'Bank Fees', 'Utilities', 'Other Expense']]].forEach(function (g) {
    g[1].forEach(function (n) { EBD.cats.push({ id: 'EC' + (++o), type: g[0], name: n, archived: false, ord: o }); });
  });
  EBD.vendors.push({ id: 'EV1', name: 'Bright Signs Co.', email: 'hello@brightsigns.test', phone: '', address: '10 Main St, Riverside, CA 92501', tin: '', is1099: true, archived: false });
  EBD.vendors.push({ id: 'EV2', name: 'Inland MLS', email: '', phone: '', address: '', tin: '', is1099: false, archived: false });
  EBD.agents.U1 = { address: '', tin: '', splitPct: 90, capAmount: '', capNote: '' };
  EBD.agents.U2 = { address: '', tin: '', splitPct: 70, capAmount: '', capNote: '' };
  var y = new Date().getFullYear(), cat = function (n) { return EBD.cats.filter(function (c) { return c.name === n; })[0].id; };
  [['expense', y + '-01-15', 450, 'Advertising & Marketing', 'vendor', 'EV1', 'Credit Card', 'Yard signs'], ['expense', y + '-02-01', 89.99, 'Software & Subscriptions', '', '', 'Credit Card', 'Transaction software'], ['expense', y + '-02-10', 320, 'MLS/Association Dues', 'vendor', 'EV2', 'ACH/Transfer', 'Quarterly dues'],
   ['income', y + '-03-05', 1500, 'Referral Income', '', '', 'Check', 'Referral from Phoenix office'], ['expense', y + '-03-20', 12600, 'Agent Commission Payouts', 'agent', 'U2', 'ACH/Transfer', 'Sample payout'], ['expense', y + '-04-02', 275, 'Advertising & Marketing', 'vendor', 'EV1', 'Check', 'Open house signs']].forEach(function (r, i) {
    EBD.entries.push({ id: 'EE' + (i + 1), type: r[0], date: r[1], amount: r[2], categoryId: cat(r[3]), payeeType: r[4], payeeId: r[5], payeeName: '', method: r[6], memo: r[7], txnId: '', source: 'manual', importKey: '', receipt: null, createdAt: now(), updatedAt: now(), deleted: false });
  });
})();
function ebGate(u) { if (!u || !u.owner || u.role !== 'admin') Fail('E-Books is only available to the owner.', 'FORBIDDEN'); }
function ebPName(e) { if (e.payeeType === 'agent') return (user(e.payeeId) || {}).name || ''; if (e.payeeType === 'vendor') return (EBD.vendors.filter(function (v) { return v.id === e.payeeId; })[0] || {}).name || ''; return e.payeeName || ''; }
function ebEOut(e) { return { id: e.id, type: e.type, date: e.date, amount: e.amount, categoryId: e.categoryId, payeeType: e.payeeType, payeeId: e.payeeId, payeeName: ebPName(e), method: e.method, memo: e.memo, txnId: e.txnId, source: e.source, importKey: e.importKey, receiptId: e.receipt ? '1' : '', receiptName: e.receipt ? e.receipt.name : '', createdAt: e.createdAt, updatedAt: e.updatedAt }; }
function ebLive() { return EBD.entries.filter(function (e) { return !e.deleted; }); }
function ebNum(v) { var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(/[$,\s]/g, '')); return isNaN(n) ? NaN : Math.round(n * 100) / 100; }
function ebN0(v) { var n = parseFloat(String(v || '').replace(/[$,%\s]/g, '')); return isNaN(n) ? 0 : n; }
function ebGrossM(t) {
  var i = t.intake || {}, base = ebN0(i.purchasePrice) || ebN0(i.listPrice) || ebN0(i.monthlyRent), tot = 0;
  ['commission', 'listingCommission', 'buyerBrokerComp'].some(function (k) { if (i[k] === undefined || i[k] === '') return false; var v = ebN0(i[k]); tot = i[k + 'Type'] === 'amount' ? v : base * v / 100; return true; });
  return Math.round(tot * 100) / 100;
}
function ebTitle(t) { return [t.address, t.city].filter(Boolean).join(', ') || (t.intake && t.intake.clientName) || t.id; }
function ebTin(v) { var d = String(v || '').replace(/\D/g, ''); if (d && d.length !== 9) Fail('A TIN (SSN or EIN) has 9 digits.'); return d; }
function ebFmt(d) { return d ? d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5) : ''; }
function ebAgentsOut() { return DB.users.map(function (x) { var p = EBD.agents[x.id] || {}; return { id: x.id, name: x.name, email: x.email, phone: x.phone || '', active: !!x.active, owner: !!x.owner, address: p.address || '', tinLast4: p.tin ? p.tin.slice(-4) : '', hasTin: !!p.tin, splitPct: p.splitPct === undefined || p.splitPct === '' ? '' : p.splitPct, capAmount: p.capAmount === undefined || p.capAmount === '' ? '' : p.capAmount, capNote: p.capNote || '' }; }); }
function ebVOut(v) { return { id: v.id, name: v.name, email: v.email, phone: v.phone, address: v.address, tinLast4: v.tin ? v.tin.slice(-4) : '', hasTin: !!v.tin, is1099: v.is1099, archived: v.archived }; }
A.ebLoad = function (b, u) {
  ebGate(u); var keys = {}; ebLive().forEach(function (e) { if (e.importKey) keys[e.importKey] = 1; });
  var txns = DB.txns.filter(function (t) { return t.status === 'Closed'; }).map(function (t) { var rec = (DB.cda || {})[t.id]; var executed = rec && rec.executed; return { id: t.id, title: ebTitle(t), type: t.type, side: t.side, closedAt: String(t.closedAt || '').slice(0, 10), agentId: t.agentId, agentName: (user(t.agentId) || {}).name || '', gross: executed ? (window.TCCda ? TCCda.grossOf(executed.header || {}) : ebGrossM(t)) : ebGrossM(t), importedIncome: !!keys['txn:' + t.id + ':income'] || !!keys['cda:' + t.id + ':brokerage'], importedPayout: !!keys['txn:' + t.id + ':payout:' + t.agentId] || !!keys['cda:' + t.id + ':agent:' + t.agentId], cdaStatus: executed ? 'executed' : (rec && rec.cda ? rec.cda.status : ''), cdaExecuted: !!executed }; });
  return { categories: EBD.cats, vendors: EBD.vendors.map(ebVOut), agents: ebAgentsOut(), entries: ebLive().map(ebEOut), txns: txns, methods: ['Check', 'ACH/Transfer', 'Wire', 'Credit Card', 'Debit Card', 'Cash', 'Zelle', 'Escrow Disbursement', 'Other'], threshold: 600 };
};
A.ebSaveEntry = function (b, u) {
  ebGate(u); var p = b.entry || {}, type = p.type === 'income' || p.type === 'expense' ? p.type : Fail('Pick Income or Expense.');
  var amt = ebNum(p.amount); if (isNaN(amt) || amt <= 0) Fail('Enter an amount greater than $0.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) Fail('Enter a valid date.');
  var c = EBD.cats.filter(function (x) { return x.id === p.categoryId; })[0]; if (!c || c.type !== type) Fail('Pick a ' + type + ' category.');
  var f = { type: type, date: p.date, amount: amt, categoryId: c.id, payeeType: p.payeeType === 'agent' || p.payeeType === 'vendor' ? p.payeeType : '', payeeId: p.payeeId || '', payeeName: String(p.payeeName || '').trim().slice(0, 120), method: p.method || '', memo: String(p.memo || '').slice(0, 500), txnId: p.txnId || '', updatedAt: now() };
  if (!f.payeeType) f.payeeId = '';
  var e; if (p.id) { e = EBD.entries.filter(function (x) { return x.id === p.id && !x.deleted; })[0]; if (!e) Fail('Entry not found.'); Object.assign(e, f); }
  else { e = Object.assign({ id: nid('EE'), source: 'manual', importKey: '', receipt: null, createdAt: now(), deleted: false }, f); EBD.entries.push(e); }
  return { entry: ebEOut(e) };
};
A.ebDeleteEntry = function (b, u) { ebGate(u); var e = EBD.entries.filter(function (x) { return x.id === b.id && !x.deleted; })[0]; if (!e) Fail('Entry not found.'); e.deleted = true; return {}; };
A.ebUploadReceipt = function (b, u) { ebGate(u); var e = EBD.entries.filter(function (x) { return x.id === b.entryId; })[0]; if (!e) Fail('Entry not found.'); e.receipt = { name: e.date + ' ' + (ebPName(e) || e.type) + ' ' + b.name, mime: b.mime, b64: b.base64 }; return { entry: ebEOut(e) }; };
A.ebGetReceipt = function (b, u) { ebGate(u); var e = EBD.entries.filter(function (x) { return x.id === b.entryId; })[0]; if (!e || !e.receipt) Fail('No receipt on this entry.'); return { name: e.receipt.name, mime: e.receipt.mime, base64: e.receipt.b64 }; };
/* 1.6.1 My E-Books (agents): same isolation as the server, every call scoped to the signed-in user. */
var MEB_CATS = ['Auto/Mileage', 'Marketing', 'MLS/Dues', 'Licensing & Education', 'Phone', 'Meals', 'Supplies', 'Gifts', 'Other'];
var MEBX = [
  { id: 'AX1', agentId: 'U2', date: new Date().getFullYear() + '-02-03', amount: 182.4, category: 'Auto/Mileage', memo: '312 miles · showings', receipt: null, deleted: false },
  { id: 'AX2', agentId: 'U2', date: new Date().getFullYear() + '-03-11', amount: 95, category: 'MLS/Dues', memo: 'Q1 MLS', receipt: null, deleted: false },
  { id: 'AX3', agentId: 'U3', date: new Date().getFullYear() + '-01-20', amount: 40, category: 'Phone', memo: 'Sample agent private', receipt: null, deleted: false }
];
function mebGate(u) { if (!u || u.owner || !u.active || (u.role !== 'agent' && u.role !== 'admin')) Fail('My E-Books is for agents.', 'FORBIDDEN'); }
function mebMine(u, id) { var e = MEBX.filter(function (x) { return x.id === id && !x.deleted && x.agentId === u.id; })[0]; if (!e) Fail('Expense not found.', 'NOT_FOUND'); return e; }
function mebOut(e) { return { id: e.id, date: e.date, amount: e.amount, category: e.category, memo: e.memo, receipt: !!e.receipt, receiptName: e.receipt ? e.receipt.name : '' }; }
A.mebLoad = function (b, u) {
  mebGate(u); var prof = EBD.agents[u.id] || {}, split = prof.splitPct === undefined || prof.splitPct === '' ? null : Number(prof.splitPct);
  function cdaHit(t) { var rec = (DB.cda || {})[t.id]; return rec && rec.executed && window.TCCda && TCCda.booksLines(rec.executed.lines).some(function (l) { return l.agentId === u.id; }); }
  var com = DB.txns.filter(function (t) { return t.status === 'Closed' && (t.agentId === u.id || cdaHit(t)); }).map(function (t) {
    var cdaPay = ebLive().filter(function (e) { return !e.deleted && e.importKey === 'cda:' + t.id + ':agent:' + u.id; }).reduce(function (s, e) { return s + e.amount; }, null);
    if (cdaHit(t)) {
      var basis = cdaPay !== null ? 'cda' : 'cda_pending';
      return { txnId: t.id, title: title(t), type: t.type, closedAt: String(t.closedAt || '').slice(0, 10), year: String(t.closedAt || '').slice(0, 4), amount: cdaPay, basis: basis };
    }
    var pay = EBD.entries.filter(function (e) { return e.type === 'expense' && e.importKey === 'txn:' + t.id + ':payout:' + u.id; }).reduce(function (s, e) { return s + e.amount; }, null);
    var g = ebGrossM(t), amt = pay !== null ? pay : (split !== null && g ? Math.round(g * split) / 100 : null);
    return { txnId: t.id, title: title(t), type: t.type, closedAt: String(t.closedAt || '').slice(0, 10), year: String(t.closedAt || '').slice(0, 4), amount: amt, basis: pay !== null ? 'paid' : amt !== null ? 'split' : 'pending' };
  });
  return { categories: MEB_CATS, commission: com, expenses: MEBX.filter(function (e) { return e.agentId === u.id && !e.deleted; }).map(mebOut).sort(function (a, c) { return String(c.date).localeCompare(String(a.date)); }) };
};
A.mebSaveExpense = function (b, u) {
  mebGate(u); var p = b.expense || {}, amt = Math.round(parseFloat(String(p.amount || '').replace(/[$,\s]/g, '')) * 100) / 100;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) Fail('Enter a valid date.'); if (!(amt > 0)) Fail('Enter an amount greater than $0.'); if (MEB_CATS.indexOf(p.category) < 0) Fail('Choose a category.');
  var v = { date: p.date, amount: amt, category: p.category, memo: String(p.memo || '').trim().slice(0, 300) }, e;
  if (p.id) { e = mebMine(u, p.id); Object.assign(e, v); } else { e = Object.assign({ id: nid('AX'), agentId: u.id, receipt: null, deleted: false }, v); MEBX.push(e); }
  return { expense: mebOut(e) };
};
A.mebDeleteExpense = function (b, u) { mebGate(u); mebMine(u, b.id).deleted = true; return {}; };
A.mebUploadReceipt = function (b, u) { mebGate(u); var e = mebMine(u, b.id); e.receipt = { name: e.date + ' ' + e.category + ' ' + b.name, mime: b.mime, b64: b.base64 }; return { expense: mebOut(e) }; };
A.mebGetReceipt = function (b, u) { mebGate(u); var e = mebMine(u, b.id); if (!e.receipt) Fail('No receipt on this expense.'); return { name: e.receipt.name, mime: e.receipt.mime, base64: e.receipt.b64 }; };
A.ebSaveCategory = function (b, u) {
  ebGate(u); var p = b.category || {}, name = String(p.name || '').trim().slice(0, 60); if (!name) Fail('Enter a category name.');
  var c = p.id ? EBD.cats.filter(function (x) { return x.id === p.id; })[0] : null; if (p.id && !c) Fail('Category not found.');
  var type = c ? c.type : (p.type === 'income' ? 'income' : 'expense');
  var dup = EBD.cats.filter(function (x) { return x.type === type && x.id !== p.id && x.name.toLowerCase() === name.toLowerCase(); })[0]; if (dup) Fail('There is already a ' + type + ' category named ' + dup.name + '.');
  if (c) { c.name = name; c.archived = !!p.archived; } else { c = { id: nid('EC'), type: type, name: name, archived: false, ord: EBD.cats.length + 1 }; EBD.cats.push(c); }
  return { category: c };
};
A.ebSaveVendor = function (b, u) {
  ebGate(u); var p = b.vendor || {}, name = String(p.name || '').trim(); if (!name) Fail('Enter the vendor name.');
  if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(p.email)) Fail('Enter a valid email or leave it blank.');
  var v = p.id ? EBD.vendors.filter(function (x) { return x.id === p.id; })[0] : null; if (p.id && !v) Fail('Vendor not found.');
  if (!v) { v = { id: nid('EV'), tin: '' }; EBD.vendors.push(v); }
  Object.assign(v, { name: name, email: p.email || '', phone: p.phone || '', address: p.address || '', is1099: !!p.is1099, archived: !!p.archived });
  if (p.tin) v.tin = ebTin(p.tin); if (p.clearTin) v.tin = '';
  return { vendor: ebVOut(v) };
};
A.ebSaveAgentProfile = function (b, u) {
  ebGate(u); var p = b.profile || {}, x = user(p.userId); if (!x) Fail('Agent not found.');
  var sp = p.splitPct === '' || p.splitPct === undefined ? '' : ebNum(p.splitPct); if (sp !== '' && (isNaN(sp) || sp < 0 || sp > 100)) Fail('The split is a percent from 0 to 100.');
  var a = EBD.agents[x.id] = EBD.agents[x.id] || { tin: '' }; a.address = p.address || ''; a.splitPct = sp;
  if (p.capAmount !== undefined) { var cap = p.capAmount === '' || p.capAmount == null ? '' : ebNum(p.capAmount); if (cap !== '' && (isNaN(cap) || cap < 0)) Fail('Cap is a dollar amount, or leave it blank.'); a.capAmount = cap; }
  if (p.capNote !== undefined) a.capNote = String(p.capNote || '').slice(0, 240);
  if (p.tin) a.tin = ebTin(p.tin); if (p.clearTin) a.tin = '';
  return { agent: ebAgentsOut().filter(function (ag) { return ag.id === x.id; })[0] };
};
function saveSplit(id, p) {
  var x = user(id); if (!x) Fail('Agent not found.');
  var sp = p.splitPct === '' || p.splitPct === undefined || p.splitPct === null ? '' : ebNum(p.splitPct);
  if (sp === '' || isNaN(sp) || sp < 0 || sp > 100) Fail('The split is a percent from 0 to 100.');
  var cap = p.capAmount === '' || p.capAmount == null ? '' : ebNum(p.capAmount);
  if (cap !== '' && (isNaN(cap) || cap < 0)) Fail('Cap is a dollar amount, or leave it blank.');
  var a = EBD.agents[x.id] = EBD.agents[x.id] || { tin: '' };
  a.splitPct = sp; a.capAmount = cap; a.capNote = String(p.capNote || '').slice(0, 240);
  return { id: x.id, splitPct: sp, capAmount: cap, capNote: a.capNote };
}
A.setAgentSplit = function (b, u) { needAdmin(u); return saveSplit(b.userId, b); };
A.ebImport = function (b, u) {
  ebGate(u); var keys = {}; ebLive().forEach(function (e) { if (e.importKey) keys[e.importKey] = 1; });
  var cat = function (n) { return EBD.cats.filter(function (c) { return c.name === n; })[0].id; }, added = 0, skipped = 0;
  (b.items || []).forEach(function (it) {
    var t = txn(it.txnId); if (!t || t.status !== 'Closed') { skipped++; return; }
    var date = String(t.closedAt || now()).slice(0, 10), title = ebTitle(t);
    var add = function (key, type, c, amount, pt, pid, memo) { if (keys[key]) { skipped++; return; } var a = ebNum(amount); if (isNaN(a) || a <= 0) return; EBD.entries.push({ id: nid('EE'), type: type, date: date, amount: a, categoryId: c, payeeType: pt, payeeId: pid, payeeName: '', method: 'Escrow Disbursement', memo: memo, txnId: t.id, source: 'import', importKey: key, receipt: null, createdAt: now(), updatedAt: now(), deleted: false }); keys[key] = 1; added++; };
    if (it.gross !== undefined) add('txn:' + t.id + ':income', 'income', cat('Commission Income'), it.gross, '', '', 'Gross commission · ' + title);
    if (it.payout !== undefined && t.agentId) add('txn:' + t.id + ':payout:' + t.agentId, 'expense', cat('Agent Commission Payouts'), it.payout, 'agent', t.agentId, 'Agent commission payout · ' + title);
  });
  return { added: added, skipped: skipped };
};
A.eb1099 = function (b, u) {
  ebGate(u); var y = String(b.year || ''), tot = {};
  ebLive().forEach(function (e) { if (e.type !== 'expense' || !e.payeeId || e.date.slice(0, 4) !== y) return; var k = e.payeeType + ':' + e.payeeId; tot[k] = tot[k] || { total: 0, fromTxns: 0, count: 0 }; tot[k].total += e.amount; tot[k].count++; if (e.txnId) tot[k].fromTxns += e.amount; });
  var out = [];
  DB.users.forEach(function (x) { var t = tot['agent:' + x.id]; if (!t) return; var p = EBD.agents[x.id] || {}; out.push({ payeeType: 'agent', id: x.id, name: x.name, email: x.email, address: p.address || '', tin: ebFmt(p.tin), missingTin: !p.tin, total: Math.round(t.total * 100) / 100, fromTxns: t.fromTxns, count: t.count }); });
  EBD.vendors.forEach(function (v) { var t = tot['vendor:' + v.id]; if (!t || !v.is1099) return; out.push({ payeeType: 'vendor', id: v.id, name: v.name, email: v.email, address: v.address, tin: ebFmt(v.tin), missingTin: !v.tin, total: Math.round(t.total * 100) / 100, fromTxns: t.fromTxns, count: t.count }); });
  out.forEach(function (r) { r.over = r.total >= 600; }); out.sort(function (a, c) { return c.total - a.total; });
  return { year: y, threshold: 600, payees: out, payer: { name: 'ENESMA Realty', email: 'admin@demo.test' } };
};
/* ---- 1.7.1 CDA (demo): same action names as CDA-EBOOKS-API.md ---- */
DB.cda = {}; DB.cdaPending = [];
function cdaAgents() {
  return DB.users.filter(function (x) { return x.active && (x.role === 'agent' || x.role === 'admin'); }).map(function (x) {
    var p = EBD.agents[x.id] || {};
    return { id: x.id, name: x.name, splitPct: p.splitPct === undefined || p.splitPct === '' ? '' : p.splitPct, capAmount: p.capAmount === undefined || p.capAmount === '' ? '' : p.capAmount };
  });
}
function cdaPack(t) {
  var M = window.TCCda, header = M.headerFromTxn(Object.assign({}, t, { agentName: (user(t.agentId) || {}).name || '' }));
  var ag = cdaAgents().filter(function (a) { return a.id === t.agentId; })[0];
  var rec = DB.cda[t.id] || {};
  return { cda: rec.cda || null, executed: rec.executed || null, versions: rec.versions || [], header: header, suggested: M.fallbackSuggest(header, ag, M.ADMIN_FEE).lines, adminFee: M.ADMIN_FEE, agents: cdaAgents(), escrowCheck: rec.escrowCheck || null, lineKinds: M.KINDS, eBooksKinds: M.EBOOKS_KINDS };
}
function cdaTxn(b, u) { return access(u, b.txnId); }
A.cdaGet = function (b, u) { return cdaPack(cdaTxn(b, u)); };
A.cdaSaveDraft = function (b, u) {
  var t = cdaTxn(b, u), rec = DB.cda[t.id] = DB.cda[t.id] || { versions: [] };
  if (rec.cda && (rec.cda.status === 'sent' || rec.cda.status === 'executed')) Fail('This CDA is out for signature or already signed. Choose Revise CDA first.', 'CONFLICT');
  var header = cdaPack(t).header, version = rec.cda ? rec.cda.version : 1;
  rec.cda = { txnId: t.id, version: version || 1, status: 'draft', lines: window.TCCda.ensureSkeleton(b.lines || [], header, window.TCCda.ADMIN_FEE), envelopeId: '', reason: (rec.cda && rec.cda.reason) || '', updatedAt: now(), header: header };
  return { cda: rec.cda };
};
A.cdaMarkSent = function (b, u) {
  var t = cdaTxn(b, u), rec = DB.cda[t.id];
  if (!rec || !rec.cda || rec.cda.status !== 'draft') Fail(rec && rec.cda && rec.cda.status === 'sent' ? 'This CDA is already out for signature. Revise it to send again.' : 'Save a draft before sending.', rec && rec.cda && rec.cda.status === 'sent' ? 'CONFLICT' : 'ERR');
  var diff = window.TCCda.round2(window.TCCda.sumLines(rec.cda.lines) - window.TCCda.grossOf(rec.cda.header || cdaPack(t).header));
  if (diff !== 0 && !b.allowMismatch) Fail('The lines do not add up to total gross.', 'MISMATCH');
  if (!b.envelopeId) Fail('Missing envelope.');
  rec.cda.status = 'sent'; rec.cda.envelopeId = String(b.envelopeId); rec.cda.updatedAt = now();
  return { cda: rec.cda };
};
A.cdaRevise = function (b, u) {
  var t = cdaTxn(b, u), rec = DB.cda[t.id]; if (!rec || !rec.cda) Fail('Nothing to revise.');
  var reason = String(b.reason || '').trim(); if (!reason) Fail('Enter a reason.');
  rec.versions = rec.versions || [];
  rec.versions.push({ version: rec.cda.version, status: rec.cda.status === 'executed' || rec.cda.status === 'sent' ? (rec.cda.status === 'executed' ? 'superseded' : 'void') : rec.cda.status, at: now(), reason: reason });
  rec.cda = { txnId: t.id, version: (rec.cda.version || 1) + 1, status: 'draft', lines: rec.cda.lines, envelopeId: '', reason: reason, updatedAt: now(), header: rec.cda.header };
  return { cda: rec.cda };
};
function cdaQueue(t, lines) {
  var want = window.TCCda.booksLines(lines), title = ebTitle(t), keys = {};
  want.forEach(function (l) {
    if (l.kind === 'brokerage') keys['cda:' + t.id + ':brokerage'] = { type: 'income', amount: l.amount, payeeType: '', payeeId: '', payeeName: l.name || 'ENESMA Realty', kind: 'brokerage', memo: 'ENESMA commission · CDA' };
    else keys['cda:' + t.id + ':agent:' + l.agentId] = { type: 'expense', amount: l.amount, payeeType: 'agent', payeeId: l.agentId, payeeName: l.name, kind: l.kind, memo: 'Agent commission · CDA' };
  });
  DB.cdaPending = DB.cdaPending.filter(function (p) { return p.txnId !== t.id; });
  var live = {}; ebLive().forEach(function (e) { if (e.importKey && e.importKey.indexOf('cda:' + t.id + ':') === 0) live[e.importKey] = e; });
  var n = 0;
  Object.keys(keys).forEach(function (k) {
    var spec = keys[k], op = live[k] ? (Math.abs(live[k].amount - spec.amount) < 0.001 ? '' : 'update') : 'add';
    if (!op) return; n++;
    DB.cdaPending.push(Object.assign({ id: nid('CP'), txnId: t.id, op: op, importKey: k, title: title, status: 'pending' }, spec));
  });
  Object.keys(live).forEach(function (k) { if (keys[k]) return; n++; DB.cdaPending.push({ id: nid('CP'), txnId: t.id, op: 'remove', importKey: k, title: title, amount: live[k].amount, payeeName: ebPName(live[k]), kind: '', status: 'pending', type: live[k].type, payeeType: live[k].payeeType, payeeId: live[k].payeeId, memo: live[k].memo }); });
  return n;
}
A.cdaOnSigned = function (b, u) {
  if (!u || u.role !== 'admin') Fail('Only the owner or an admin can file a signed CDA.', 'FORBIDDEN');
  var t = cdaTxn(b, u), rec = DB.cda[t.id]; if (!rec || !rec.cda) Fail('No CDA to file.');
  if (!b.base64) Fail('The signed PDF is missing.');
  var header = cdaPack(t).header;
  rec.cda.status = 'executed'; rec.cda.updatedAt = now(); rec.cda.header = header; if (b.envelopeId) rec.cda.envelopeId = String(b.envelopeId);
  rec.executed = JSON.parse(JSON.stringify(rec.cda));
  rec.versions = rec.versions || []; rec.versions.push({ version: rec.cda.version, status: 'executed', at: now() });
  var item = itemsOf(t.id).filter(function (i) { return i.active && (i.code === 'P_CDA_COMMISSION_DISBURSEMENT_' || i.code === 'CDA'); })[0];
  var doc = addDoc(t, item, String(b.name || 'CDA-signed.pdf').slice(0, 150), u.id, 'Approved', { b64: b.base64 });
  if (item) item.status = 'Approved';
  ebLive().forEach(function (e) { if (e.importKey && e.importKey.indexOf('txn:' + t.id + ':') === 0) e.deleted = true; });
  return { cda: rec.cda, docId: doc.id, itemStatus: item ? item.status : '', queued: cdaQueue(t, rec.cda.lines) };
};
A.ebCdaPending = function (b, u) { ebGate(u); return { pending: DB.cdaPending.slice() }; };
A.ebCdaDecide = function (b, u) {
  ebGate(u); var ids = b.ids || [], decision = b.decision === 'approve' || b.decision === 'reject' ? b.decision : Fail('Choose approve or reject.');
  var date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : new Date().toISOString().slice(0, 10), approved = 0, rejected = 0;
  var cat = function (n) { return EBD.cats.filter(function (c) { return c.name === n; })[0].id; };
  ids.forEach(function (id) {
    var i = DB.cdaPending.filter(function (p) { return p.id === id; })[0]; if (!i) return;
    if (decision === 'reject') { rejected++; DB.cdaPending = DB.cdaPending.filter(function (p) { return p.id !== id; }); return; }
    var live = ebLive().filter(function (e) { return e.importKey === i.importKey; })[0];
    if (i.op === 'remove') { if (live) live.deleted = true; }
    else if (live) { live.amount = i.amount; live.updatedAt = now(); live.date = date; }
    else EBD.entries.push({ id: nid('EE'), type: i.type, date: date, amount: i.amount, categoryId: i.type === 'income' ? cat('Commission Income') : cat('Agent Commission Payouts'), payeeType: i.payeeType || '', payeeId: i.payeeId || '', payeeName: '', method: 'Escrow Disbursement', memo: i.memo || '', txnId: i.txnId, source: 'cda', importKey: i.importKey, receipt: null, createdAt: now(), updatedAt: now(), deleted: false });
    approved++; DB.cdaPending = DB.cdaPending.filter(function (p) { return p.id !== id; });
  });
  return { approved: approved, rejected: rejected };
};
A.ebConfirmEscrowCheck = function (b, u) {
  ebGate(u); var t = txn(b.txnId); if (!t) Fail('Transaction not found.'); if (t.status !== 'Closed') Fail('Confirm the escrow check on a closed file.');
  var rec = DB.cda[t.id]; if (!rec || !rec.executed) Fail('A fully signed CDA is required first.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) Fail('Enter the check date.'); if (!String(b.checkNumber || '').trim()) Fail('Enter the check number.');
  var amount = ebNum(b.amount); if (!(amount > 0)) Fail('Enter the check amount.');
  var expected = window.TCCda.grossOf(rec.executed.header || cdaPack(t).header), difference = window.TCCda.round2(amount - expected), match = difference === 0;
  rec.escrowCheck = { date: b.date, checkNumber: String(b.checkNumber).trim(), amount: amount, expected: expected, difference: difference, match: match, confirmedAt: now(), confirmedBy: u.id, locked: match };
  return { escrowCheck: rec.escrowCheck };
};
var OPEN = { ping: 1, login: 1, requestPasswordCode: 1, resetPasswordWithCode: 1 };
window.TC_MOCK = {
  call: function (body) {
    return new Promise(function (res) {
      setTimeout(function () {
        try {
          var fn = A[body.action]; if (!fn) Fail('Unknown action.');
          var u = null;
          if (!OPEN[body.action]) {
            u = user(DB.sessions[body.token]); if (!u || !u.active) Fail('Please sign in again.', 'AUTH');
            if (u.mustChange && ['me', 'changePassword', 'logout'].indexOf(body.action) < 0) Fail('Choose a new password first.', 'MUST_CHANGE');
          }
          var data = fn(JSON.parse(JSON.stringify(body)), u);
          res({ ok: true, data: JSON.parse(JSON.stringify(data)) });
        } catch (e) { if (!e.tc) console.error(e); res({ ok: false, error: e.message, code: e.code || 'ERR' }); }
      }, 120);
    });
  }
};
})();
