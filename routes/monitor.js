'use strict';

const express = require('express');
const router = express.Router();
const { ServerError, ParamsError } = require('../lib/_error');
const { error } = require('../lib/_response');
const { verify_user } = require('../models/user');
const { get_my_monitor_user_websites, get_my_monitor_user_website_domain } = require('../models/website');
const { get_my_monitor_user_website_pages, add_my_monitor_user_website_pages } = require('../models/page');
const { get_my_monitor_newest_evaluation } = require('../models/evaluation');

router.post('/user/websites', async function(req, res, next) {
  try {
    req.check('cookie', 'User not logged in').exists();

    const errors = req.validationErrors();
    if (errors) {
      res.send(error(new ParamsError(errors)));
    } else {
      const user_id = await verify_user(res, req.body.cookie, false);
      if (user_id !== -1) {
        get_my_monitor_user_websites(user_id)
          .then(websites => res.send(websites))
          .catch(err => res.send(err));
      }
    }
  } catch (err) {
    console.log(err);
    res.send(error(new ServerError(err)));
  }
});

router.post('/user/website/pages', async function(req, res, next) {
  try {
    req.check('website', 'Invalid website').exists();
    req.check('cookie', 'User not logged in').exists();

    const errors = req.validationErrors();
    if (errors) {
      res.send(error(new ParamsError(errors)));
    } else {
      const user_id = await verify_user(res, req.body.cookie, false);
      if (user_id !== -1) {
        const website = req.body.website;

        get_my_monitor_user_website_pages(user_id, website)
          .then(pages => res.send(pages))
          .catch(err => res.send(err));
      }
    }
  } catch (err) {
    res.send(error(new ServerError(err)));
  }
});

router.post('/user/website/domain', async function(req, res, next) {
  try {
    req.check('website', 'Invalid website parameter').exists();
    req.check('cookie', 'User not logged in').exists();

    const errors = req.validationErrors();
    if (errors) {
      res.send(error(new ParamsError(errors)));
    } else {
      const user_id = await verify_user(res, req.body.cookie, false);
      if (user_id !== -1) {
        const website = req.body.website;

        get_my_monitor_user_website_domain(user_id, website)
          .then(domain => res.send(domain))
          .catch(err => res.send(err));
      }
    }
  } catch (err) {
    res.send(error(new ServerError(err)));
  }
});

router.post('/user/website/addPages', async function(req, res, next) {
  try {
    req.check('website', 'Invalid website parameter').exists();
    req.check('domain', 'Invalid website parameter').exists();
    req.check('pages', 'Invalid pages parameter').exists();
    req.check('cookie', 'User not logged in').exists();

    const errors = req.validationErrors();
    if (errors) {
      res.send(error(new ParamsError(errors)));
    } else {
      const user_id = await verify_user(res, req.body.cookie, false);
      if (user_id !== -1) {
        const website = req.body.website;
        const domain = req.body.domain;
        const pages = JSON.parse(req.body.pages);

        add_my_monitor_user_website_pages(user_id, website, domain, pages)
          .then(pages => res.send(pages))
          .catch(err => res.send(err));
      }
    }
  } catch (err) {
    res.send(error(new ServerError(err)));
  }
});

router.post('/evaluation', async function(req, res, next) {
  try {
    req.check('website', 'Invalid website parameter').exists();
    req.check('url', 'Invalid url parameter').exists();
    req.check('cookie', 'User not logged in').exists();

    const errors = req.validationErrors();
    if (errors) {
      res.send(error(new ParamsError(errors)));
    } else {
      const user_id = await verify_user(res, req.body.cookie, false);
      if (user_id !== -1) {
        const website = req.body.website;
        const url = decodeURIComponent(req.body.url);

        get_my_monitor_newest_evaluation(user_id, website, url)
          .then(evaluation => res.send(evaluation))
          .catch(err => res.send(err));
      }
    }
  } catch (err) {
    res.send(error(new ServerError(err)));
  }
});

module.exports = router;