const { sql } = require("../models/db");
const { Shopify } = require("@shopify/shopify-api");
require("dotenv").config();

const marginArr = [
  "10% or Higher",
  "20% or Higher",
  "30% or Higher",
  "40% or Higher",
  "50% or Higher",
  "60% or Higher",
  "70% or Higher",
  "80% or Higher",
  "90% or Higher",
];

const productCheck = async (requestID) => {
  try {
    const Products = await sql`select * from products 
      where product_id = ${requestID}`;
    return Products;
  } catch (error) {
    console.error(error.message);
    // res.status(500).send("Internal Server Error");
    return {
      statusCode: 500,
      message: "Internal Server Error",
    };
  }
};

const productAdd = async (productData) => {
  try {
    const savedProduct = await sql`
          insert into products ${sql(
            productData,
            "product_id",
            "product_title",
            "unit_price",
            "retail_price"
          )}
          returning *
        `;
    return savedProduct;
  } catch (error) {
    console.error(error.message);
    // res.status(500).send("Internal Server Error");
    return {
      statusCode: 500,
      message: "Internal Server Error",
    };
  }
};

const productUpdate = async (productData, productId) => {
  try {
    const updateProduct = await sql`
                update products set ${sql(
                  productData,
                  "product_title",
                  "unit_price",
                  "retail_price"
                )}
                where product_id = ${productId}
                returning *
              `;
    return updateProduct;
  } catch (error) {
    console.error(error.message);
    // res.status(500).send("Internal Server Error");
    return {
      statusCode: 500,
      message: "Internal Server Error",
    };
  }
};

const shopifyProductUpdate = async (graphqlProductId, metafields) => {
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
            key: "margin_range",
            namespace: "filter",
            ownerId: "gid://shopify/Product/" + graphqlProductId,
            type: "list.single_line_text_field",
            value: JSON.stringify(metafields),
          },
        ],
      },
    },
  });
  return JSON.stringify(metafieldResponse);
};

const findElements = async (object, key) => {
  // console.log(object);
  return object.find((element) => {
    if (element.key === key) {
      return true;
    }
    return false;
  });
};

const getPrecentage = async (retailPrice, price) => {
  const profit = ((retailPrice - price) / price) * 100;
  // console.log(retailPrice, price, profit);
  return profit;
};

function removeFirstWord(str) {
  const indexOfSpace = str.indexOf(" ");
  if (indexOfSpace === -1) {
    return "";
  }
  return str.substring(indexOfSpace + 1);
}

module.exports.createProduct = async (event, context, callback) => {
  const EVENT_NAME = "B2B_ENTITY_PRODUCT_EVENT__PRODUCT_CREATED";
//   const { id, title, variants, metafields } = event.detail.payload;
//   const retailPriceValue = await findElements(metafields, "retail_price");
//   const productData = {
//     product_id: id,
//     product_title: title,
//     unit_price: variants[0].price,
//     retail_price: retailPriceValue.value,
//   };
//   //const productUpdateResult = await productAdd(productData, id);
//   console.log(JSON.stringify(productData));
//   return {
//     statusCode: 200,
//     body: productData,
//   };

    try {
      const { id, title, variants, metafields } = event.detail.payload;
      if (metafields.length == 0) {
        return {
          statusCode: 200,
          message: "Metafields does not exists",
        };
      }
      const productCheckResult = await productCheck(id);
      const retailPriceValue = await findElements(metafields, "retail_price");

      if (productCheckResult.length === 0) {
        let retailAPrice = retailPriceValue.value;
        let retailActualPrice = retailAPrice.replace(/(?!-)[^0-9.]/g, ""); //replace(/\D/g, "");
        const percentCalc = await getPrecentage(
          retailActualPrice,
          variants[0].price
        );

        const percentCalculate = percentCalc.toFixed(0);

        const marginVal = marginArr.map((res, i) => res.split("%")[0]);
        const closest = marginVal.filter(
          (num) => num <= Number(percentCalculate)
        );

        var minMargin, finalMargin;
        if (closest && closest.length) {
          minMargin = Math.max(...closest);
          finalMargin = marginVal.filter((num) => num <= minMargin);
          const setMargin = finalMargin.map(
            (res) => `${res}% ${removeFirstWord(marginArr[0])}`
          );
          const productData = {
            product_id: id,
            product_title: title,
            unit_price: variants[0].price,
            retail_price: retailPriceValue.value,
          };
          const productUpdateResult = await productAdd(productData, id);
          const shopifyResponse = await shopifyProductUpdate(id, setMargin);
          return {
            statusCode: 200,
            message: shopifyResponse,
          };
        } else {
          const productData = {
            product_id: id,
            product_title: title,
            unit_price: variants[0].price,
            retail_price: retailPriceValue.value,
          };
          const productUpdateResult = await productAdd(productData, id);
          return {
            statusCode: 200,
            message: "Margin less then expected",
          };
        }
      } else {
        if (
          retailPriceValue.value != productCheckResult.retail_price ||
          variants[0].price != productCheckResult.unit_price
        ) {
          let retailAPrice = retailPriceValue.value;
          let retailActualPrice = retailAPrice.replace(/(?!-)[^0-9.]/g, ""); //replace(/\D/g, "");
          const percentCalc = await getPrecentage(
            retailActualPrice,
            variants[0].price
          );

          const percentCalculate = percentCalc.toFixed(0);

          const marginVal = marginArr.map((res, i) => res.split("%")[0]);
          const closest = marginVal.filter(
            (num) => num <= Number(percentCalculate)
          );

          var minMargin, finalMargin;
          if (closest && closest.length) {
            minMargin = Math.max(...closest);
            finalMargin = marginVal.filter((num) => num <= minMargin);
            const setMargin = finalMargin.map(
              (res) => `${res}% ${removeFirstWord(marginArr[0])}`
            );
            const productData = {
              product_id: id,
              product_title: title,
              unit_price: variants[0].price,
              retail_price: retailPriceValue.value,
            };
            const productUpdateResult = await productUpdate(productData, id);
            const shopifyResponse = await shopifyProductUpdate(id, setMargin);
            return {
              statusCode: 200,
              message: shopifyResponse,
            };
          } else {
            const productData = {
              product_id: id,
              product_title: title,
              unit_price: variants[0].price,
              retail_price: retailPriceValue.value,
            };
            const productUpdateResult = await productUpdate(productData, id);
            return {
              statusCode: 200,
              message: "Margin less then expected",
            };
          }
        } else {
          return {
            statusCode: 200,
            message: "Same data request",
          };
        }
      }
    } catch (error) {
      console.error(error.message);
      return {
        statusCode: 500,
        message: "Internal Server Error",
      };
    }

};
