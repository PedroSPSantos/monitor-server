'use strict';

/**
 * Website Model
 */

/**
 * Libraries and modules
 */
const _ = require('lodash');
const {
  success,
  error
} = require('../lib/_response');
const {
  execute_query
} = require('../lib/_database');

const {
  file_exists,
  get_file_stats
} = require('../lib/_util');

const {
  evaluate_url,
  save_page_evaluation
} = require('./evaluation');


const {
  update_page_admin
} = require('./page');

/**
 * Create functions
 */

module.exports.create_website = async (name, domain, entity_id, user_id, tags) => {
  try {
    domain = _.replace(domain, 'https://', '');
    domain = _.replace(domain, 'http://', '');
    domain = _.replace(domain, 'www.', '');

    if (_.endsWith(domain, '/')) {
      domain = domain.substring(0, _.size(domain) - 1);
    }

    const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

    let query = `
      SELECT 
        w.*, d.Active 
      FROM 
        Website as w,
        Domain as d
      WHERE
        d.Url = "${domain}" AND
        w.WebsiteId = d.WebsiteId AND
        w.Deleted = "1"
      LIMIT 1
      `;
    const website = await execute_query(query);

    let website_id = -1;

    if (_.size(website) > 0) {
      website_id = website[0].WebsiteId;

      query = `UPDATE Website 
        SET 
          Name = "${name}", Deleted = "0"
          ${entity_id !== "null" ? ", EntityId = " + entity_id : "" }
          ${user_id !== "null" ? ", UserId = " + user_id : "" }
        WHERE WebsiteId = "${website_id}"
        `;
      await execute_query(query);

      if (website[0].Active === 0) {

        query = `UPDATE Domain SET Active = "0", End_Date = "${date}" WHERE WebsiteId = "${website_id}" AND Active = "1"`;
        await execute_query(query);

        query = `UPDATE Domain SET Active = "1", End_Date = NULL WHERE WebsiteId = "${website_id}" AND Url = "${domain}"`;
        await execute_query(query);
      }
    } else {
      query = `INSERT INTO Website (Name, Creation_Date) VALUES ("${name}", "${date}")`;

      if (entity_id !== 'null' && user_id !== 'null') {
        query = `INSERT INTO Website (EntityId, UserId, Name, Creation_Date) 
        VALUES ("${entity_id}", "${user_id}", "${name}", "${date}")`;
      } else if (entity_id !== 'null') {
        query = `INSERT INTO Website (EntityId, Name, Creation_Date) 
        VALUES ("${entity_id}", "${name}", "${date}")`;
      } else if (user_id !== 'null') {
        query = `INSERT INTO Website (UserId, Name, Creation_Date) 
        VALUES ("${user_id}", "${name}", "${date}")`;
      }

      const new_website = await execute_query(query);
      website_id = new_website.insertId;

      query = `INSERT INTO Domain (WebsiteId, Url, Start_Date, Active) 
        VALUES ("${new_website.insertId}", "${domain}", "${date}", "1")`;

      await execute_query(query);
    }

    for (let t of tags) {
      query = `INSERT INTO TagWebsite (TagId, WebsiteId) VALUES ("${t}", "${website_id}")`;
      await execute_query(query);
    }

    return success(website_id);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

/**
 * Get functions
 */

module.exports.get_number_of_study_monitor_websites = async () => {
  try {
    const query = `SELECT COUNT(w.WebsiteId) as Websites FROM Website as w, User as u WHERE LOWER(u.Type) = "studies" AND w.UserId = u.UserId`;
    const websites = await execute_query(query);
    return success(websites[0].Websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_number_of_my_monitor_websites = async () => {
  try {
    const query = `SELECT COUNT(w.WebsiteId) as Websites FROM Website as w, User as u WHERE LOWER(u.Type) = "monitor" AND w.UserId = u.UserId`;
    const websites = await execute_query(query);
    return success(websites[0].Websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_number_of_observatorio_websites = async () => {

  try {
    const query = `SELECT COUNT(w.WebsiteId) as Websites FROM Website as w, Tag as t, TagWebsite as tw 
      WHERE t.Show_in_Observatorio = "1" AND tw.TagId = t.TagId AND w.WebsiteId = tw.WebsiteId`;
    const websites = await execute_query(query);
    return success(websites[0].Websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.website_name_exists = async (name) => {
  try {
    const query = `SELECT w.* 
      FROM 
        Website as w,
        User as u 
      WHERE 
        LOWER(w.Name) = "${_.toLower(name)}" AND
        (w.UserId IS NULL OR (u.UserId = w.UserId AND LOWER(u.Type) != 'studies')) AND
        w.Deleted = "0"
      LIMIT 1`;
    const website = await execute_query(query);
    return success(_.size(website) === 1);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_all_websites = async () => {
  try {
    const query = `SELECT w.*, e.Short_Name as Entity, e.Long_Name as Entity2, u.Username as User, u.Type as Type, d.DomainId
      FROM Website as w
      LEFT OUTER JOIN Entity as e ON e.EntityId = w.EntityId
      LEFT OUTER JOIN User as u ON u.UserId = w.UserId
      LEFT OUTER JOIN Domain as d ON d.WebsiteId = w.WebsiteId AND d.Active = "1"
      WHERE 
        (w.UserId IS NULL OR (u.UserId = w.UserId AND LOWER(u.Type) != 'studies')) AND
        w.Deleted = "0"
      GROUP BY w.WebsiteId, d.DomainId`;
    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_all_official_websites = async () => {
  try {
    const query = `SELECT distinct w.* 
      FROM 
        Website as w, 
        User as u 
      WHERE 
        (w.UserId IS NULL OR (u.UserId = w.UserId AND LOWER(u.Type) != 'studies')) AND
        w.Deleted = "0"`;
    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_all_websites_without_entity = async () => {
  try {
    const query = `SELECT distinct w.* 
      FROM 
        Website as w, 
        User as u 
      WHERE 
        w.EntityId IS NULL AND
        w.Deleted = "0" AND
        (w.UserId IS NULL OR (u.UserId = w.UserId AND LOWER(u.Type) != 'studies'))`;
    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_all_websites_without_user = async () => {
  try {
    const query = `SELECT * FROM Website WHERE UserId IS NULL AND Deleted = "0"`;
    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}


module.exports.get_all_user_websites = async (user) => {
  try {
    const query = `SELECT w.*, d.Url, e.Short_Name as Entity, e.Long_Name as Entity2, u.Username as User 
      FROM 
        Website as w
        LEFT OUTER JOIN Entity as e ON e.EntityId = w.EntityId,
        User as u,
        Domain as d
      WHERE
        LOWER(u.Username) = "${_.toLower(user)}" AND
        w.UserId = u.UserId AND 
        d.WebsiteId = w.WebsiteId AND
        d.Active = "1"
      GROUP BY w.WebsiteId, d.Url`;
    const websites = await execute_query(query);

    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
};

module.exports.get_all_tag_websites = async (user, tag) => {
  try {
    /*const query = `SELECT w.*, e.Short_Name as Entity, e.Long_Name as Entity2, u.Username as User 
      FROM 
        Website as w
        LEFT OUTER JOIN Entity as e ON e.EntityId = w.EntityId
        LEFT OUTER JOIN User as u ON u.UserId = w.UserId,
        Tag as t,
        TagWebsite as tw
      WHERE
        LOWER(t.Name) = "${_.toLower(tag)}" AND
        t.UserId IS NULL AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId
      GROUP BY w.WebsiteId`;*/

    let query = '';
    if (user === 'admin') {
      query = `SELECT w.*, e.Short_Name as Entity, e.Long_Name as Entity2, u.Username as User 
        FROM 
          Website as w
          LEFT OUTER JOIN Entity as e ON e.EntityId = w.EntityId
          LEFT OUTER JOIN User as u ON u.UserId = w.UserId,
          Tag as t,
          TagWebsite as tw
        WHERE
          LOWER(t.Name) = "${_.toLower(tag)}" AND
          t.UserId IS NULL AND
          tw.TagId = t.TagId AND
          w.WebsiteId = tw.WebsiteId
        GROUP BY w.WebsiteId`;
    } else {
      query = `SELECT w.*, d.Url, e.Long_Name as Entity, u.Username as User 
        FROM 
          Website as w
          LEFT OUTER JOIN Entity as e ON e.EntityId = w.EntityId,
          User as u,
          Tag as t,
          TagWebsite as tw,
          Domain as d
        WHERE
          LOWER(t.Name) = "${_.toLower(tag)}" AND
          u.Username = "${user}" AND
          t.UserId = u.UserId AND
          tw.TagId = t.TagId AND
          w.WebsiteId = tw.WebsiteId AND 
          d.WebsiteId = w.WebsiteId
        GROUP BY w.WebsiteId, d.Url`;
    }

    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_all_entity_websites = async (entity) => {
  try {
    const query = `SELECT w.*, e.Short_Name as Entity, e.Long_Name as Entity2, u.Username as User 
      FROM 
        Website as w
        LEFT OUTER JOIN User as u ON u.UserId = w.UserId,
        Entity as e
      WHERE
        e.EntityId = w.EntityId AND
        LOWER(e.Long_Name) = "${_.toLower(entity)}"
      GROUP BY w.WebsiteId`;
    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_all_websites_info = async () => {
  try {
    const query = `
      SELECT 
        w.WebsiteId,
        w.Name, 
        w.Creation_Date,
        e.Short_Name as Entity,
        u.Username as User,
        d.Url as Current_Domain,
        COUNT(distinct p.PageId) as Pages,
        COUNT(distinct tw.TagId) as Tags
      FROM 
        Website as w
        LEFT OUTER JOIN Entity as e ON e.EntityId =  w.EntityId
        LEFT OUTER JOIN User as u ON u.UserId = w.UserId
        LEFT OUTER JOIN Domain as d ON d.WebsiteId = w.WebsiteId AND d.Active = 1
        LEFT OUTER JOIN Page as p ON p.DomainId = d.DomainId
        LEFT OUTER JOIN TagWebsite as tw ON tw.WebsiteId = w.WebsiteId
      GROUP BY w.WebsiteId, d.Url`;

    const websites = await execute_query(query);
    return success(websites);
  } catch (err) {
    return error(err)
  }
}

module.exports.get_website_current_domain = async (websiteId) => {
  try {
    const query = `SELECT Url FROM Domain WHERE WebsiteId = "${websiteId}" AND Active = 1 LIMIT 1`;
    const domain = await execute_query(query);
    return success(_.size(domain) > 0 ? domain[0].Url : '');
  } catch (err) {
    return error(err)
  }
}

module.exports.get_website_info = async (website_id) => {
  try {
    let query = `SELECT w.*, u.Username as User, e.Long_Name as Entity, d.Url as Domain
      FROM 
        Website as w
        LEFT OUTER JOIN User as u ON u.UserId = w.UserId
        LEFT OUTER JOIN Entity as e ON e.EntityId = w.EntityId
        LEFT OUTER JOIN Domain as d ON d.WebsiteId = "${website_id}" AND d.Active = 1
      WHERE 
        w.WebsiteId = "${website_id}"
      GROUP BY w.WebsiteId, d.Url 
      LIMIT 1`;
    let website = await execute_query(query);

    if (_.size(website) === 0) {
      //throw new WebsiteNotFoundError();
    } else {
      website = website[0];

      query = `SELECT t.* FROM Tag as t, TagWebsite as tw WHERE tw.WebsiteId = "${website_id}" AND t.TagId = tw.TagId`;
      const tags = await execute_query(query);

      website.tags = tags;
    }

    return success(website);
    q
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

/**
 * MY MONITOR
 */

module.exports.get_my_monitor_user_websites = async (user_id) => {
  //AQUI

  try {
    const query = `SELECT w.*, d.Url as Domain, COUNT(distinct p.PageId) as Pages
      FROM
        Website as w
        LEFT OUTER JOIN Domain as d ON d.WebsiteId = w.WebsiteId AND d.Active = 1
        LEFT OUTER JOIN DomainPage as dp ON dp.DomainId = d.DomainId
        LEFT OUTER JOIN Page as p ON p.PageId = dp.PageId AND LOWER(p.Show_In) LIKE '_1%'
      WHERE
        w.UserId = "${user_id}"
      GROUP BY w.WebsiteId, d.Url`;
    const websites = await execute_query(query);

    return success(websites);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.get_my_monitor_user_website_domain = async (user_id, website) => {
  try {
    const query = `SELECT d.Url FROM 
        Website as w,
        Domain as d
      WHERE
        w.UserId = "${user_id}" AND
        LOWER(w.Name) = "${_.toLower(website)}" AND
        d.WebsiteId = w.WebsiteId AND
        d.Active = 1
      LIMIT 1`;
    const domain = await execute_query(query);

    return success(_.size(domain) > 0 ? domain[0].Url : null);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

/**
 * ACCESS STUDIES
 */

module.exports.get_study_monitor_user_websites_from_other_tags = async (user_id, tag) => {
  try {
    const query = `SELECT
        distinct w.*,
        d.Url,
        t.Name as TagName
      FROM
        Tag as t,
        TagWebsite as tw,
        Website as w,
        Domain as d
      WHERE
        LOWER(t.Name) != "${_.toLower(tag)}" AND
        t.UserId = "${user_id}" AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId AND
        w.UserId = "${user_id}" AND
        w.Name NOT IN (
          SELECT 
            w2.Name 
          FROM
            Tag as t2,
            TagWebsite as tw2,
            Website as w2
          WHERE
            LOWER(t2.Name) = "${_.toLower(tag)}" AND
            t2.UserId = "${user_id}" AND
            tw2.TagId = t2.TagId AND
            w2.WebsiteId = tw2.WebsiteId AND
            w2.UserId = "${user_id}"
        ) AND
        d.WebsiteId = w.WebsiteId AND
        d.Url NOT IN (
          SELECT 
            d2.Url 
          FROM
            Tag as t2,
            TagWebsite as tw2,
            Website as w2,
            Domain as d2
          WHERE
            LOWER(t2.Name) = "${_.toLower(tag)}" AND
            t2.UserId = "${user_id}" AND
            tw2.TagId = t2.TagId AND
            w2.WebsiteId = tw2.WebsiteId AND
            w2.UserId = "${user_id}" AND
            d2.WebsiteId = w2.WebsiteId
        );`;
    const websites = await execute_query(query);

    return success(websites);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.get_study_monitor_user_tag_websites = async (user_id, tag) => {
  try {
    let query = `SELECT * FROM Tag WHERE UserId = "${user_id}" AND LOWER(Name) = "${_.toLower(tag)}" LIMIT 1`;
    const tagExist = await execute_query(query);

    if (_.size(tagExist) === 0) {
      return error({
        code: -1,
        message: 'USER_TAG_INEXISTENT',
        err: null
      });
    }

    query = `SELECT 
        w.WebsiteId,
        w.Name,
        d.Url,
        COUNT(distinct p.PageId) as Pages,
        AVG(distinct e.Score) as Score
      FROM
        Tag as t,
        TagWebsite as tw,
        Website as w,
        Domain as d
        LEFT OUTER JOIN DomainPage as dp ON dp.DomainId = d.DomainId
        LEFT OUTER JOIN Page as p ON p.PageId = dp.PageId
        LEFT OUTER JOIN Evaluation as e ON e.Evaluation_Date IN (
          SELECT max(Evaluation_Date) FROM Evaluation WHERE PageId = p.PageId
        )
      WHERE
        LOWER(t.Name) = "${_.toLower(tag)}" AND
        t.UserId = "${user_id}" AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId AND
        w.UserId = "${user_id}" AND
        d.WebsiteId = w.WebsiteId
      GROUP BY w.WebsiteId, d.Url`;
    const websites = await execute_query(query);

    return success(websites);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.get_study_monitor_user_tag_websites_data = async (user_id, tag) => {
  try {
    const query = `SELECT
        w.WebsiteId,
        w.Name,
        d.Url,
        p.Uri,
        e.Score,
        e.Tot,
        e.A,
        e.AA,
        e.AAA,
        e.Evaluation_Date
      FROM 
        Page as p,
        Tag as t,
        TagWebsite as tw,
        Website as w,
        Domain as d,
        DomainPage as dp,
        Evaluation as e
      WHERE
        LOWER(t.Name) = "${_.toLower(tag)}" AND
        t.UserId = "${user_id}" AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId AND
        w.UserId = "${user_id}" AND
        d.WebsiteId = w.WebsiteId AND
        dp.DomainId = d.DomainId AND
        p.PageId = dp.PageId AND
        e.PageId = p.PageId AND
        e.Evaluation_Date IN (SELECT max(Evaluation_Date) FROM Evaluation WHERE PageId = p.PageId);`;
    const websites = await execute_query(query);

    return success(websites);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.add_study_monitor_user_tag_existing_website = async (user_id, tag, websitesId) => {
  try {
    for (let id of websitesId) {
      let query = `INSERT INTO TagWebsite (TagId, WebsiteId) 
        SELECT TagId, "${id}" FROM Tag WHERE LOWER(Name) = "${_.toLower(tag)}" AND UserId = "${user_id}"`;
      await execute_query(query);
    }

    return await this.get_study_monitor_user_tag_websites(user_id, tag);
  } catch (err) {
    console.log(err);
    throw error(error);
  }
}

module.exports.add_study_monitor_user_tag_new_website = async (user_id, tag, name, domain, pages) => {
  try {
    let date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    let query = `INSERT INTO Website (UserId, Name, Creation_Date) VALUES ("${user_id}", "${name}", "${date}")`;
    const website = await execute_query(query);

    query = `INSERT INTO TagWebsite (TagId, WebsiteId) SELECT TagId, "${website.insertId}" FROM Tag WHERE Name = "${tag}"`;
    await execute_query(query);

    query = `INSERT INTO Domain (WebsiteId, Url, Start_Date, Active) VALUES ("${website.insertId}", "${domain}", "${date}", "1")`;
    const _domain = await execute_query(query);

    const errors = {};
    const size = _.size(pages);
    for (let i = 0; i < size; i++) {
      query = `SELECT PageId FROM Page WHERE Uri = "${pages[i]}" LIMIT 1`;
      let page = await execute_query(query);

      if (_.size(page) === 0) {
        let evaluation = null;

        try {
          evaluation = await evaluate_url(pages[i], 'examinator');
        } catch (e) {
          errors[pages[i]] = -1;
          evaluation = null;
        }

        if (evaluation !== null && evaluation.success === 1 && evaluation.result !== null) {
          query = `INSERT INTO Page (Uri, Show_In, Creation_Date) VALUES ("${pages[i]}", "000", "${date}")`;
          let newPage = await execute_query(query);

          await save_page_evaluation(newPage.insertId, evaluation, "01");

          query = `INSERT INTO DomainPage (DomainId, PageId) VALUES ("${_domain.insertId}", "${newPage.insertId}")`;
          await execute_query(query);

          query = `SELECT distinct d.DomainId, d.Url 
                  FROM
                    User as u,
                    Website as w,
                    Domain as d
                  WHERE
                    LOWER(d.Url) = "${_.toLower(domain)}" AND
                    d.WebsiteId = w.WebsiteId AND
                    (
                      w.UserId IS NULL OR
                      (
                        u.UserId = w.UserId AND
                        u.Type = 'monitor'
                      )
                    )
                  LIMIT 1`;

          const existing_domain = await execute_query(query);

          if (_.size(existing_domain) > 0) {
            query = `INSERT INTO DomainPage (DomainId, PageId) VALUES ("${existing_domain[0].DomainId}", "${newPage.insertId}")`;
            await execute_query(query);
          }
        } else {
          errors[pages[i]] = -1;
        }
      } else {
        query = `INSERT INTO DomainPage (DomainId, PageId) VALUES ("${_domain.insertId}", "${page[0].PageId}")`;
        await execute_query(query);
      }
    }

    const newWebsites = await this.get_study_monitor_user_tag_websites(user_id, tag);

    if (_.size(_.keys(errors)) > 0) {
      return error({
        code: 0,
        message: 'SOME_PAGES_ERRORS',
        err: errors
      }, newWebsites.result);
    } else {
      return newWebsites;
    }
  } catch (err) {
    console.log(err);
    throw error(error);
  }
}

module.exports.remove_study_monitor_user_tag_websites = async (user_id, tag, websites_id) => {
  try {
    let query = ``;
    for (const id of websites_id) {
      query = `SELECT * FROM TagWebsite WHERE WebsiteId = "${id}" AND TagId <> -1`;
      const relations = await execute_query(query);
      if (_.size(relations) > 1) {
        query = `
          DELETE tw FROM Tag as t, TagWebsite as tw 
          WHERE 
            LOWER(t.Name) = "${_.toLower(tag)}" AND
            tw.TagId = t.TagId AND
            tw.WebsiteId = "${id}"`;
        await execute_query(query);
      } else {
        query = `DELETE FROM Website WHERE WebsiteId = "${id}"`;
        await execute_query(query);
      }
    }

    return await this.get_study_monitor_user_tag_websites(user_id, tag);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.study_monitor_user_tag_website_name_exists = async (user_id, tag, name) => {
  try {
    const query = `SELECT * FROM 
        Tag as t,
        TagWebsite as tw,
        Website as w
      WHERE
        LOWER(t.Name) = "${_.toLower(tag)}" AND
        t.UserId = "${user_id}" AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId AND
        w.UserId = "${user_id}" AND
        LOWER(w.Name) = "${_.toLower(name)}"
      LIMIT 1`;
    const websites = await execute_query(query);

    return success(_.size(websites) > 0);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.study_monitor_user_tag_website_domain_exists = async (user_id, tag, domain) => {
  try {
    const query = `SELECT * FROM 
        Tag as t,
        TagWebsite as tw,
        Website as w,
        Domain as d
      WHERE
        LOWER(t.Name) = "${_.toLower(tag)}" AND
        t.UserId = "${user_id}" AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId AND
        w.UserId = "${user_id}" AND
        d.DomainId = w.WebsiteId AND
        LOWER(d.Url) = "${_.toLower(domain)}"
      LIMIT 1`;
    const websites = await execute_query(query);

    return success(_.size(websites) > 0);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.get_study_monitor_user_tag_website_domain = async (user_id, tag, website) => {
  try {
    const query = `SELECT d.Url FROM 
        Tag as t,
        TagWebsite as tw,
        Website as w,
        Domain as d
      WHERE
        LOWER(t.Name) = "${_.toLower(tag)}" AND
        t.UserId = "${user_id}" AND
        tw.TagId = t.TagId AND
        w.WebsiteId = tw.WebsiteId AND
        w.UserId = "${user_id}" AND
        LOWER(w.Name) = "${_.toLower(website)}" AND
        d.WebsiteId = w.WebsiteId
      LIMIT 1`;
    const domain = await execute_query(query);

    return success(_.size(domain) > 0 ? domain[0].Url : null);
  } catch (err) {
    console.log(err);
    throw error(err);
  }
}

module.exports.update_website = async (website_id, name, entity_id, user_id, older_user_id, transfer, default_tags, tags) => {
  try {
    let query = `UPDATE Website SET Name = "${name}", ${entity_id ? "EntityId = " + entity_id : ""}, ${user_id ? "UserId = " + user_id : ""} WHERE WebsiteId = "${website_id}"`;
    await execute_query(query);

    if (older_user_id === 'null' && user_id !== 'null') {
      if (transfer) {
        query = `
          UPDATE
            Domain as d, 
            DomainPage as dp, 
            Page as p,
            Evaluation as e
          SET 
            p.Show_In = "111",
            e.Show_To = "11" 
          WHERE
            d.WebsiteId = "${website_id}" AND
            dp.DomainId = d.DomainId AND
            p.PageId = dp.PageId AND
            p.Show_In LIKE "101" AND
            e.PageId = p.PageId`;
        await execute_query(query);
      }
    } else if ((older_user_id !== 'null' && user_id !== 'null' && older_user_id !== user_id) || older_user_id !== 'null' && user_id === 'null') {
      if (!transfer || (older_user_id && !user_id)) {
        query = `
          UPDATE
            Domain as d, 
            DomainPage as dp, 
            Page as p,
            Evaluation as e
          SET 
            p.Show_In = "101",
            e.Show_To = "10" 
          WHERE
            d.WebsiteId = "${website_id}" AND
            dp.DomainId = d.DomainId AND
            p.PageId = dp.PageId AND
            p.Show_In = "111" AND
            e.PageId = p.PageId`;
        await execute_query(query);
      }

      query = `
        UPDATE 
          Domain as d, 
          DomainPage as dp, 
          Page as p,
          Evaluation as e
        SET 
          p.Show_In = "100",
          e.Show_To = "10"
        WHERE
          d.WebsiteId = "${website_id}" AND
          dp.DomainId = d.DomainId AND
          p.PageId = dp.PageId AND
          p.Show_In = "110" AND
          e.PageId = p.PageId`;
      await execute_query(query);

      query = `
        UPDATE 
          Domain as d, 
          DomainPage as dp, 
          Page as p,
          Evaluation as e
        SET 
          p.Show_In = "000",
          e.Show_To = "10"
        WHERE
          d.WebsiteId = "${website_id}" AND
          dp.DomainId = d.DomainId AND
          p.PageId = dp.PageId AND
          p.Show_In = "010" AND
          e.PageId = p.PageId`;
      await execute_query(query);
    }

    for (let tag_id of default_tags) {
      if (!_.includes(tags, tag_id)) {
        query = `DELETE FROM TagWebsite WHERE TagId = "${tag_id}" AND WebsiteId = "${website_id}"`;
        await execute_query(query);
      }
    }

    for (let tag_id of tags) {
      if (!_.includes(default_tags, tag_id)) {
        query = `INSERT INTO TagWebsite (TagId, WebsiteId) VALUES ("${tag_id}", "${website_id}")`;
        await execute_query(query);
      }
    }

    return success(website_id);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

module.exports.delete_website = async (website_id) => {
  try {
    let query = `DELETE FROM TagWebsite WHERE WebsiteId = "${website_id}" AND TagId <> 0`;
    await execute_query(query);

    query = `
      UPDATE 
        Domain as d, 
        DomainPage as dp, 
        Page as p
      SET 
        p.Show_In = "000"
      WHERE
        d.WebsiteId = "${website_id}" AND
        dp.DomainId = d.DomainId AND
        p.PageId = dp.PageId
    `;
    await execute_query(query);

    query = `UPDATE Website SET UserId = NULL, EntityId = NULL, Deleted = 1 WHERE WebsiteId = "${website_id}"`;
    await execute_query(query);

    return success(website_id);
  } catch (err) {
    console.log(err);
    return error(err);
  }
}

var fs = require('fs'),
  gm = require('gm').subClass({
    imageMagick: true
  });

module.exports.get_website_stamp_information = async domain => {
  try {
    const path = __dirname + '/../public/stamps/' + encodeURIComponent(domain) + '.jpg';

    const exists = await file_exists(path);
    const stats = null;
    const week = 604800000; //milliseconds

    if (exists) {
      stats = await get_file_stats(path);
    }

    if (!exists | (exists && new Date().getTime() > stats.mtimeMs + week)) {
      const query = `SELECT
        p.PageId,
        e.A,
        e.AA,
        e.AAA,
        e.Score
      FROM
        User as u,
        Website as w,
        Domain as d,
        DomainPage as dp,
        Page as p
        LEFT OUTER JOIN Evaluation e ON e.PageId = p.PageId AND e.Evaluation_Date = (
          SELECT Evaluation_Date FROM Evaluation 
          WHERE PageId = p.PageId 
          ORDER BY Evaluation_Date DESC LIMIT 1
        )
      WHERE
        d.Url = "${domain}" AND
        w.WebsiteId = d.WebsiteId AND
        (
          w.UserId IS NULL OR
          (
            u.UserId = w.UserId AND
            LOWER(u.Type) != 'studies'
          )
        ) AND
        dp.DomainId = d.DomainId AND
        p.PageId = dp.PageId AND
        p.Show_In LIKE "1_1"
      GROUP BY p.PageId, e.A, e.AA, e.AAA, e.Score`;
      const result = await execute_query(query);

      const n_pages = _.size(result);

      const hasLevelError = {
        'A': 0,
        'AA': 0,
        'AAA': 0
      };

      let score = 0;

      for (const page of result) {
        if (page.A > 0) {
          hasLevelError.A++;
        }
        if (page.AA > 0) {
          hasLevelError.AA++;
        }
        if (page.AAA > 0) {
          hasLevelError.AAA++;
        }

        score += page.Score;
      }

      score = (score / n_pages).toFixed(1);

      gm(200, 400, '#ddff99f3')
        .drawText(10, 50, 'from scratch')
        .write(path, function (err) {
          if (err) console.log(err);
        });
    }

    const uri = 'http://194.117.20.202/server/stamps/' + encodeURIComponent(domain) + '.jpg';

    return success(uri);
  } catch (err) {
    console.log(err);
    return error(err);
  }
};

//substituir data
//method to import website, domain and tag from selected page of studymonitor
module.exports.update_website_admin = async (website_id, newWebsiteName) => {
  try {
    let query = `SELECT distinct w.*, d.*
      FROM 
      Page as p, 
      Domain as d, 
      Website as w,
      DomainPage as dp 
      WHERE 
      w.WebsiteId = "${website_id}" AND
      d.WebsiteId ="${website_id}" AND 
      d.Active = "1"`;

    let webDomain = await execute_query(query);

    let domDate = webDomain[0].Start_Date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    let webDate = webDomain[0].Creation_Date.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    query = `SELECT p.*
      FROM 
      Page as p, 
      Domain as d, 
      Website as w,
      DomainPage as dp 
      WHERE 
      w.WebsiteId = "${website_id}" AND
      d.WebsiteId ="${website_id}"AND 
      dp.domainId = d.domainId AND
      dp.PageId = p.PageId`;
    let pages = await execute_query(query);

    query = `SELECT distinct d.DomainId, w.*
            FROM  
              Domain as d,
              Website as w,
              User as u
            WHERE 
              d.Url = "${webDomain[0].Url}" AND
              w.WebsiteId = d.WebsiteId AND
              (w.UserId IS NULL OR (u.UserId = w.UserId AND u.Type = "monitor"))
            LIMIT 1
            `;
    let domainP = await execute_query(query);
    domainP = domainP[0];

    let domainUrl = webDomain[0].Url;

    let returnWebsiteId = website_id;
    if (_.size(webDomain) > 0) {
      if (domainP) {
        for (let page of pages) {
          if (page.Show_In[0] === '0') {
            await update_page_admin(page.PageId);
            try {
              query = `INSERT INTO DomainPage (DomainId, PageId) VALUES ("${domainP.domainId}", "${page.PageId}")`;
              await execute_query(query);
            } catch (err) {

            }
          }
        }
        if (domainP.Deleted === 1) {
          query = `UPDATE Website SET Name = "${newWebsiteName || domainP.Name}", Creation_Date = "${webDate}", Deleted = "0" WHERE WebsiteId = "${domainP.WebsiteId}"`;
          await execute_query(query);
        } else {
          query = `UPDATE Website SET Creation_Date = "${webDate}" WHERE WebsiteId = "${domainP.WebsiteId}"`;
          await execute_query(query);
        }
      } else {
        query = `INSERT INTO Website (Name, Creation_Date) VALUES ("${newWebsiteName}", "${webDate}")`;
        let website = await execute_query(query);
        returnWebsiteId = website.insertId;

        query = `INSERT INTO Domain ( WebsiteId,Url, Start_Date, Active) VALUES ( "${website.insertId}","${domainUrl}", "${domDate}", "1")`;
        let domain = await execute_query(query);

        for (let page of pages) {
          if (page.Show_In[0] === '0') {
            await update_page_admin(page.PageId);
            query = `INSERT INTO DomainPage (DomainId, PageId) VALUES ("${domain.insertId}", "${page.PageId}")`;
            await execute_query(query);
          }
        }
      }
    }
    return success(returnWebsiteId);
  } catch (err) {
    console.log(err);
    return error(err);
  }
};

module.exports.verify_update_website_admin = async (website_id) => {
  try {

    let query = `SELECT p.PageId
      FROM  
      Page as p, 
      Domain as d,
      DomainPage as dp,
      Website as w
      WHERE 
      w.WebsiteId = "${website_id}" AND
      d.WebsiteId = w.WebsiteId AND
      dp.DomainId = d.DomainId AND
      dp.PageId = p.PageId AND
      p.Show_In LIKE '0%' `;
    let studyP = await execute_query(query);

    return _.size(studyP) === 0;
  } catch (err) {
    console.log(err);
    return error(err);
  }
};