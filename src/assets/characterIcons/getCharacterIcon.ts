import zero from "./0/stock.png";
import one from "./1/stock.png";
import two from "./2/stock.png";
import three from "./3/stock.png";
import four from "./4/stock.png";
import five from "./5/stock.png";
import six from "./6/stock.png";
import seven from "./7/stock.png";
import eight from "./8/stock.png";
import nine from "./9/stock.png";
import ten from "./10/stock.png";
import eleven from "./11/stock.png";
import twelve from "./12/stock.png";
import thirteen from "./13/stock.png";
import fourteen from "./14/stock.png";
import fifteen from "./15/stock.png";
import sixteen from "./16/stock.png";
import seventeen from "./17/stock.png";
import eighteen from "./18/stock.png";
import nineteen from "./19/stock.png";
import twenty from "./20/stock.png";
import twentyOne from "./21/stock.png";
import twentyTwo from "./22/stock.png";
import twentyThree from "./23/stock.png";
import twentyFour from "./24/stock.png";
import twentyFive from "./25/stock.png";

export const getCharacterIcon = (id: string) => {
  switch (id) {
    case "0":
      return zero;
    case "1":
      return one;
    case "2":
      return two;
    case "3":
      return three;
    case "4":
      return four;
    case "5":
      return five;
    case "6":
      return six;
    case "7":
      return seven;
    case "8":
      return eight;
    case "9":
      return nine;
    case "10":
      return ten;
    case "11":
      return eleven;
    case "12":
      return twelve;
    case "13":
      return thirteen;
    case "14":
      return fourteen;
    case "15":
      return fifteen;
    case "16":
      return sixteen;
    case "17":
      return seventeen;
    case "18":
      return eighteen;
    case "19":
      return nineteen;
    case "20":
      return twenty;
    case "21":
      return twentyOne;
    case "22":
      return twentyTwo;
    case "23":
      return twentyThree;
    case "24":
      return twentyFour;
    case "25":
      return twentyFive;
    default:
      return zero;
  }
};
