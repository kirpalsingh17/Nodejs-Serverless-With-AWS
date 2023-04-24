const { Shopify } = require("@shopify/shopify-api");
require("dotenv").config();

const shopifyProductUpdate = async (graphqlProductId, preOrderStatus) => {
  const client = new Shopify.Clients.Graphql(
    process.env.SHOPIFY_STORE,
    process.env.SHOPIFY_ACCESS_KEY
  );

  const metafieldResponse = await client.query({
    data: {
      query: `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              key
              value            
            }
            userErrors {
              field
              message
              code
            }
          }
        }`,
      variables: {
        metafields: [
          {
            key: "product_fob_tag",
            namespace: "my_fields",
            ownerId: "gid://shopify/Product/" + graphqlProductId,
            type: "boolean",
            value: preOrderStatus,
          },
        ],
      },
    },
  });
  return JSON.stringify(metafieldResponse);
};

module.exports.updateProduct = async (event, context, callback) => {
  try {
    const { id, title, variants, metafields } = event.detail.payload;
    var preOrder;
    const isFound = variants.some((element) => {
      if (
        element.inventory_management === "shopify" &&
        element.inventory_policy === "deny"
      ) {
        if (element.inventory_quantity > 0) {
          preOrder = "false";
        } else {
          preOrder = "true";
        }
        return true;
      }
      return false;
    });
    console.log({ preOrder, isFound });
    // return;
    if (isFound) {
      const shopifyResponse = await shopifyProductUpdate(id, preOrder);
      return {
        statusCode: 200,
        message: JSON.stringify({ shopifyResponse }),
      };
    } else {
      return {
        statusCode: 200,
        message:
          "Inventory Management, Inventory Policy & Inventory Quantity does not meet condition",
        data: variants,
      };
    }
  } catch (error) {
    console.error(error.message);
    return {
      statusCode: 500,
      message: "Internal Server Error",
    };
  }
};
