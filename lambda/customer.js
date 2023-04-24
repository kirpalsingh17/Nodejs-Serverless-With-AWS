const { Shopify } = require("@shopify/shopify-api");

require("dotenv").config();

const shopifyCustomerTagUpdate = async (graphqlCustomerId, tags) => {
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
        id: "gid://shopify/Customer/" + graphqlCustomerId,
        tags: tags,
      },
    },
  });
  return JSON.stringify(metafieldResponse);
};

module.exports.customerCheck = async (event, context, callback) => {
  try {
    const { email } = JSON.parse(event.body);

    const client = new Shopify.Clients.Graphql(
      process.env.SHOPIFY_STORE,
      process.env.SHOPIFY_ACCESS_KEY
    );
    console.log(email);
    console.log("================>");

    const response = await client.query({
      data: `{
                  customers(first: 1, query:"email:${email}") {
                    edges {
                      node {
                        id                
                        verifiedEmail
                        displayName,
                        tags
                      }
                    }
                  }
                }`,
    });

    const customerData = response.body.data.customers.edges;
    console.log(customerData);
    if (customerData.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: customerData,
          success: false,
        }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: customerData,
        success: true,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        data: "Internal Server Errors",
        success: false,
      }),
    };
  }
};

module.exports.customerTagUpdate = async (event, context, callback) => {
  try {
    console.log({ event, context, callback });
    const { id, tags } = JSON.parse(event.body);
    const shopifyResponse = await shopifyCustomerTagUpdate(id, tags);
    console.log(
      "Shopify Console=====>",
      typeof shopifyResponse,
      shopifyResponse
    );

    const customerTagDataResponse = JSON.parse(shopifyResponse);
    console.log("customerTagData========>", customerTagDataResponse);
    if ("node" in customerTagDataResponse.body.data.tagsAdd) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: customerTagDataResponse.body.data.tagsAdd,
          success: true,
        }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: customerTagDataResponse.body.data.tagsAdd,
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
