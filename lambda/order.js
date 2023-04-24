const { Shopify } = require("@shopify/shopify-api");

require("dotenv").config();
const vendersName = process.env.VENDOR_NAMES;
const orderMarketPlaceTags = process.env.ORDER_MARKETPLACE_TAGS;
const orderPaymentTermTags = process.env.ORDER_PAYMENT_TERM_TAGS;

const vendorExists = async (lineItemsArray, vendor) => {
  return lineItemsArray.some(function (el) {
    return el.vendor === vendor;
  });
};

const shopifyOrderTagUpdate = async (graphqlOrderId, combineTagsString) => {
  const client = new Shopify.Clients.Graphql(
    process.env.SHOPIFY_STORE,
    process.env.SHOPIFY_ACCESS_KEY
  );

  const metafieldResponse = await client.query({
    data: {
      query: `mutation addTags($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            node {
              id
            }
            userErrors {
              message
            }
          }
        }`,
      variables: {
        id: "gid://shopify/Order/" + graphqlOrderId,
        tags: combineTagsString,
      },
    },
  });
  return JSON.stringify(metafieldResponse);
};

module.exports.orderTagUpdate = async (event, context, callback) => {
  try {
    const vendersNameArray = vendersName.split("|");
    const lineItemsArray = event.detail.payload.line_items;
    const paymentTermsArray = event.detail.payload.payment_terms;
    var checkVendor = false;
    var checkPaymentTerm = false;
    var combineTags = "";
    for (let vender of vendersNameArray) {
      let vendorExistsCheck = await vendorExists(lineItemsArray, vender);
      if (vendorExistsCheck === true) {
        checkVendor = true;
        break;
      }
    }
    if (paymentTermsArray != null) {
      checkPaymentTerm = true;
      console.log("Not Null");
    }
    if (!checkVendor && checkPaymentTerm) {
      combineTags = `${orderMarketPlaceTags},${orderPaymentTermTags}`;
    } else if (!checkVendor) {
      combineTags = `${orderMarketPlaceTags}`;
    } else if (checkPaymentTerm) {
      combineTags = `${orderPaymentTermTags}`;
    }

    console.log({ orderMarketPlaceTags, orderPaymentTermTags, combineTags });

    if (combineTags) {
      const shopifyResponse = await shopifyOrderTagUpdate(
        event.detail.payload.id, combineTags
      );
      console.log(
        "Shopify Console=====>",
        typeof shopifyResponse,
        shopifyResponse
      );

      const orderTagDataResponse = JSON.parse(shopifyResponse);
      console.log("customerTagData========>", orderTagDataResponse);
      if ("node" in orderTagDataResponse.body.data.tagsAdd) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: orderTagDataResponse.body.data.tagsAdd,
            success: true,
          }),
        };
      } else {
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: orderTagDataResponse.body.data.tagsAdd,
            success: false,
          }),
        };
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: "Vendor does not exists",
          success: false,
        }),
      };
    }
  } catch (error) {
    console.log("Error===============>", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        data: "Internal Server Errors",
        success: false,
      }),
    };
  }
};
