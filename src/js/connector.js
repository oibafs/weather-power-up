import { defaultUnitForLocale, celsiusToFahrenheit, kphToMph } from './modules/util';
import fetchWeatherData from './modules/api';
import getConditionKey from './modules/conditions-map';
import localizationSettings from './modules/localizationSettings';

const { Promise } = window.TrelloPowerUp;
const REFRESH_INTERVAL = 1800; // 30 minutes in seconds

const showBadge = (command, type, prefs) => {
  if (command === 'card-badges') {
    return prefs[`${type}-front`] !== false;
  }
  if (command === 'card-detail-badges') {
    return prefs[`${type}-back`] !== false;
  }

  throw new Error('Unknown command', command);
};

const getWeatherBadges = (t, opts) =>
  Promise.all([
    t.card('coordinates'),
    t.get('member', 'private', 'units', defaultUnitForLocale(opts.locale)),
    t.get('board', 'shared'),
  ]).then(([card, units, prefs]) => {
    if (!card.coordinates) {
      // if the card doesn't have a location at all, we won't show any badges
      return [];
    }
    console.log(card.coordinates);

    const tempBadge = {
      dynamic(trello) {
        return fetchWeatherData(trello).then(weatherData => {
          let { temp } = weatherData;
          if (units === 'metric') {
            temp = `${temp.toFixed()} °C`;
          } else {
            temp = `${celsiusToFahrenheit(temp).toFixed()} °F`;
          }
          return {
            title: trello.localizeKey('temperature'),
            text: temp,
            refresh: REFRESH_INTERVAL,
          };
        });
      },
    };

    const windBadge = {
      dynamic(trello) {
        return fetchWeatherData(trello).then(weatherData => {
          let windSpeed = weatherData.wind;
          if (units === 'metric') {
            windSpeed = `🌬️ ${windSpeed.toFixed()} kph`;
          } else {
            windSpeed = `🌬️ ${kphToMph(windSpeed).toFixed()} mph`;
          }
          return {
            title: trello.localizeKey('wind-speed'),
            text: windSpeed,
            refresh: REFRESH_INTERVAL,
          };
        });
      },
    };

    const conditionsBadge = {
      dynamic(trello) {
        return fetchWeatherData(trello).then(weatherData => {
          const conditionKey = getConditionKey(weatherData.conditions);
          return {
            title: trello.localizeKey('conditions'),
            icon: `https://openweathermap.org/img/w/${weatherData.icon}.png`,
            text: conditionKey ? trello.localizeKey(conditionKey) : '',
            refresh: REFRESH_INTERVAL,
          };
        });
      },
    };

    let badges = [];

    if (!prefs || typeof prefs !== 'object') {
      // default to all badges
      badges = [tempBadge, windBadge, conditionsBadge];
    } else {
      // there are some potential preferences
      [
        ['temp', tempBadge],
        ['wind', windBadge],
        ['conditions', conditionsBadge],
      ].forEach(([type, badge]) => {
        if (showBadge(t.getContext().command, type, prefs)) {
          badges.push(badge);
        }
      });
    }

    return badges;
  });

  function showIframe(t) {
    return t.popup({
      title: 'Authorize to continue',
      url: './authorize.html'
    });
  }
  
  function showMenu(t) {
    return t.popup({
      title: 'Do something cool',
      items: [
        // …
      ]
    });
  }

const getAPIClient = (t) => {
  return t.getRestApi()
  // We now have an instance of the API client.
  .isAuthorized()
  .then(function(isAuthorized) {
    if (isAuthorized) {
      return [{
        text: 'Weather Power-Up',
        callback: showMenu
      }];
    } else {
      return [{
        text: 'Weather Power-Up',
        callback: showIframe
      }];
    }
  })
}

const postponeCard = (t, options) => {
  return t.card('all')
  .then(function (card) {
    // console.log(JSON.stringify(card, null, 2));
    getAPIClient(t);
  });
}

const displayCardButton = (t, options) => {
  return [{
    icon: 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421',
    text: 'Postpone card',
    callback: postponeCard,
  }];
}

const showSettings = (t) => {
  return t.popup({
    title: t.localizeKey('weather-settings'),
    url: './settings.html',
    height: 281
  })
}

window.TrelloPowerUp.initialize(
  {
// /*    'card-buttons': function(t, options){
//       return [{
//         icon: 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421',
//         text: 'Postpone card',
//       }];
//     },*/
    'card-buttons': displayCardButton,
    'card-badges': getWeatherBadges,
    'card-detail-badges': getWeatherBadges,
    'show-settings': showSettings,
    },
    {
      appKey: '039f30a96f8f3e440addc095dd42f87d',
      appName: 'Weather Power-up'
    },
  // },
  {
    localization: localizationSettings,
  }
);
