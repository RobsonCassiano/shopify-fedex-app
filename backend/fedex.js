/**
 * FedEx Integration Module
 * Handles all FedEx API interactions
 */
import fetch from 'node-fetch';

async function parseApiResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.errors?.[0]?.message || data?.message || response.statusText);
    error.response = { data };
    throw error;
  }

  return data;
}

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(payload)
  });

  return parseApiResponse(response);
}

async function postForm(url, payload, headers = {}) {
  const body = new URLSearchParams(payload);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers
    },
    body
  });

  return parseApiResponse(response);
}

class FedExService {
  constructor() {
    this.baseApiUrl = (process.env.FEDEX_API_URL || 'https://apis.fedex.com').replace(/\/$/, '');
    this.apiKey = process.env.FEDEX_API_KEY;
    this.secretKey = process.env.FEDEX_SECRET_KEY;
    this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER;
    this.shipApiUrl = process.env.FEDEX_SHIP_API_URL || `${this.baseApiUrl}/ship/v1`;
    this.rateApiUrl = process.env.FEDEX_RATE_API_URL || `${this.baseApiUrl}/rate/v1`;
    this.oauthUrl = process.env.FEDEX_OAUTH_URL || `${this.baseApiUrl}/oauth/token`;
    this.trackApiUrl = process.env.FEDEX_TRACK_API_URL || `${this.baseApiUrl}/track/v1`;
  }

  /**
   * Get FedEx OAuth Token
   */
  async getOAuthToken() {
    try {
      const data = await postForm(this.oauthUrl, {
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.secretKey
      });
      return data.access_token;
    } catch (error) {
      console.error('Error getting FedEx OAuth token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Shipping Rates from FedEx
   * @param {Object} shipmentData - Shipment details
   */
  async getShippingRates(shipmentData) {
    try {
      const token = await this.getOAuthToken();

      const payload = {
        accountNumber: this.accountNumber,
        rateRequestControlParameters: {
          servicesNeeded: true,
          returnTransitTimes: true
        },
        shipDate: shipmentData.shipDate || new Date().toISOString().split('T')[0],
        pickupType: 'CONTACT_FEDEX_TO_SCHEDULE',
        shipper: {
          address: {
            streetLines: [shipmentData.shipper.street],
            city: shipmentData.shipper.city,
            stateOrProvinceCode: shipmentData.shipper.state,
            postalCode: shipmentData.shipper.zipCode,
            countryCode: shipmentData.shipper.country || 'BR'
          }
        },
        recipients: [
          {
            address: {
              streetLines: [shipmentData.recipient.street],
              city: shipmentData.recipient.city,
              stateOrProvinceCode: shipmentData.recipient.state,
              postalCode: shipmentData.recipient.zipCode,
              countryCode: shipmentData.recipient.country || 'BR'
            }
          }
        ],
        packages: [
          {
            weight: {
              units: 'KG',
              value: shipmentData.weight || 1
            },
            dimensions: {
              length: shipmentData.length || 20,
              width: shipmentData.width || 20,
              height: shipmentData.height || 20,
              units: 'CM'
            }
          }
        ]
      };

      const data = await postJson(
        `${this.rateApiUrl}/rates/quotes`,
        payload,
        {
          'Authorization': `Bearer ${token}`,
          'X-locale': 'pt_BR'
        }
      );

      console.log('FedEx rates fetched successfully');
      return data;
    } catch (error) {
      console.error('Error fetching FedEx rates:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Shipment with FedEx
   * @param {Object} shipmentData - Shipment details
   */
  async createShipment(shipmentData) {
    try {
      const token = await this.getOAuthToken();

      const payload = {
        labelResponseOptions: 'URL_ONLY',
        accountNumber: {
          value: this.accountNumber
        },
        requestedShipment: {
          shipper: {
            contact: {
              personName: shipmentData.shipper?.personName || 'ROBSON SILVA',
              companyName: shipmentData.shipper?.companyName || 'FedEx Express',
              phoneNumber: shipmentData.shipper?.phone || '11949460165',
              emailAddress: shipmentData.shipper?.email || 'robson.silva@fedex.com'
            },
            tins: [
              {
                number: shipmentData.shipper?.taxId || '00676486000182',
                tinType: shipmentData.shipper?.tinType || 'BUSINESS_NATIONAL'
              }
            ],
            address: {
              streetLines: [
                shipmentData.shipper?.street || 'Rua Doutor Rubens Gomes Bueno, 691 Conj 81 Bloco B Cond 17007'
              ],
              city: shipmentData.shipper?.city || 'Sao Paulo',
              stateOrProvinceCode: shipmentData.shipper?.state || 'SP',
              postalCode: shipmentData.shipper?.zipCode || '04730903',
              countryCode: shipmentData.shipper?.country || 'BR'
            }
          },
          recipients: [
            {
              contact: {
                personName: shipmentData.recipient?.personName || 'test test',
                companyName: shipmentData.recipient?.companyName || 'test test',
                phoneNumber: shipmentData.recipient?.phone || '13434343434',
                emailAddress: shipmentData.recipient?.email || 'cliente@example.com'
              },
              tins: [
                {
                  number: shipmentData.recipient?.taxId || '12345678901',
                  tinType: shipmentData.recipient?.tinType || 'FEDERAL_EIN'
                }
              ],
              address: {
                streetLines: [
                  shipmentData.recipient?.street || '4900 O\'Hear Avenue, Suite 100'
                ],
                city: shipmentData.recipient?.city || 'North Charleston',
                stateOrProvinceCode: shipmentData.recipient?.state || 'SC',
                postalCode: shipmentData.recipient?.zipCode || '29405',
                countryCode: shipmentData.recipient?.country || 'US'
              }
            }
          ],
          shippingChargesPayment: {
            paymentType: shipmentData.paymentType || 'SENDER',
            payor: {
              responsibleParty: {
                accountNumber: {
                  value: this.accountNumber
                }
              }
            }
          },
          shipDatestamp: shipmentData.shipDate || new Date().toISOString().split('T')[0],
          pickupType: shipmentData.pickupType || 'CONTACT_FEDEX_TO_SCHEDULE',
          serviceType: shipmentData.serviceType || 'FEDEX_INTERNATIONAL_CONNECT_PLUS',
          packagingType: shipmentData.packagingType || 'YOUR_PACKAGING',
          blockInsightVisibility: false,
          labelSpecification: {
            imageType: 'PDF',
            labelStockType: 'PAPER_85X11_TOP_HALF_LABEL',
            customerSpecifiedDetail: {
              maskedData: [
                'TRANSPORTATION_CHARGES_PAYOR_ACCOUNT_NUMBER',
                'DUTIES_AND_TAXES_PAYOR_ACCOUNT_NUMBER'
              ]
            }
          },
          shipmentSpecialServices: {
            specialServiceTypes: [
              'ELECTRONIC_TRADE_DOCUMENTS'
            ],
            etdDetail: {
              attributes: [
                'POST_SHIPMENT_UPLOAD_REQUESTED'
              ],
              requestedDocumentTypes: [
                'COMMERCIAL_INVOICE',
                'CUSTOM_SHIPMENT_DOCUMENT'
              ]
            }
          },
          shippingDocumentSpecification: {
            shippingDocumentTypes: [
              'COMMERCIAL_INVOICE'
            ],
            commercialInvoiceDetail: {
              customerImageUsages: [
                {
                  id: 'IMAGE_1',
                  type: 'SIGNATURE',
                  providedImageType: 'SIGNATURE'
                }
              ],
              documentFormat: {
                docType: 'PDF',
                stockType: 'PAPER_LETTER'
              }
            }
          },
          customsClearanceDetail: {
            dutiesPayment: {
              paymentType: shipmentData.dutiesPaymentType || 'RECIPIENT'
            },
            isDocumentOnly: false,
            totalCustomsValue: {
              amount: shipmentData.customsValue || 512,
              currency: shipmentData.currency || 'USD'
            },
            commodities: [
              {
                description: shipmentData.itemDescription || 'The 3p Fulfilled Snowboard',
                countryOfManufacture: shipmentData.countryOfManufacture || 'US',
                harmonizedCode: shipmentData.harmonizedCode || '08119000',
                quantity: shipmentData.quantity || 1,
                quantityUnits: 'PCS',
                unitPrice: {
                  currency: shipmentData.currency || 'USD',
                  amount: shipmentData.unitPrice || 512
                },
                customsValue: {
                  currency: shipmentData.currency || 'USD',
                  amount: shipmentData.customsValue || 512
                },
                weight: {
                  units: 'KG',
                  value: shipmentData.weight || 1
                }
              }
            ]
          },
          totalPackageCount: 1,
          requestedPackageLineItems: [
            {
              sequenceNumber: 1,
              weight: {
                units: 'KG',
                value: shipmentData.weight || 1
              },
              dimensions: {
                length: shipmentData.length || 40,
                width: shipmentData.width || 20,
                height: shipmentData.height || 20,
                units: 'CM'
              },
              customerReferences: [
                {
                  customerReferenceType: 'CUSTOMER_REFERENCE',
                  value: shipmentData.referenceNumber || '#1024'
                }
              ]
            }
          ]
        },
        carrierCodes: [
          'FDXE'
        ]
      };

      const data = await postJson(
        `${this.shipApiUrl}/shipments`,
        payload,
        {
          'Authorization': `Bearer ${token}`,
          'X-locale': 'pt_BR'
        }
      );

      console.log('Shipment created successfully');
      return {
        trackingNumber: data.output?.transactionShipments?.[0]?.masterTrackingNumber,
        labelUrl: data.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.url,
        shipmentData: data
      };
    } catch (error) {
      console.error('Error creating FedEx shipment:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Track Shipment
   * @param {string} trackingNumber - FedEx tracking number
   */
  async trackShipment(trackingNumber) {
    try {
      const token = await this.getOAuthToken();

      const payload = {
        includeDetailedScans: true,
        trackingInfo: [
          {
            trackingNumberInfo: {
              trackingNumber: trackingNumber
            }
          }
        ]
      };

      const data = await postJson(
        `${this.trackApiUrl}/trackingnumbers`,
        payload,
        {
          'Authorization': `Bearer ${token}`
        }
      );

      return data;
    } catch (error) {
      console.error('Error tracking shipment:', error.response?.data || error.message);
      throw error;
    }
  }
}

const fedexService = new FedExService();

export async function createFedexShipment(shipmentData) {
  return fedexService.createShipment(shipmentData);
}

export async function getFedexShippingRates(shipmentData) {
  return fedexService.getShippingRates(shipmentData);
}

export async function trackFedexShipment(trackingNumber) {
  return fedexService.trackShipment(trackingNumber);
}

export default fedexService;
