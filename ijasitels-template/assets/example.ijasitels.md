---
title: "Predicting Student Dropout with Gradient Boosting: Evidence from a Romanian University"
authors:
  - name: Ana Popescu
    affiliation: [1]
    orcid: 0000-0001-2345-6789
    email: ana.popescu@ulbsibiu.ro
  - name: Ion Ionescu
    affiliation: [1, 2]
    orcid: 0000-0002-3456-7890
    email: ion.ionescu@example.org
affiliations:
  - id: 1
    text: "Lucian Blaga University of Sibiu, Department of Computer Science and Electrical Engineering, Sibiu, Romania"
  - id: 2
    text: "Example Research Institute, Bucharest, Romania"
abstract: |
  This paper examines whether gradient boosting models can predict first-year dropout from
  administrative data. Using records of 4,812 students, we compare logistic regression with
  gradient boosting and report an AUC of 0.86 for the best model. The results indicate that
  early grades and attendance are the strongest predictors.
keywords: [student dropout, gradient boosting, educational data mining, prediction]
journal:
  issue: "December 2026* Vol. XVI, no. 1"   # header on pages 2+
  doi: ""                                   # left as ________________ when empty
  year: 2026                                # © year in first-page footer
acknowledgment: |
  The authors thank the university registry for access to anonymised data.
references:
  - id: friedman2001
    text: "J. H. Friedman, *Greedy Function Approximation: A Gradient Boosting Machine*, Annals of Statistics, 29(5), pp. 1189-1232, ISSN 0090-5364, 2001."
  - id: hastie2009
    text: "T. Hastie, R. Tibshirani, J. Friedman, *The Elements of Statistical Learning*, Springer, New York, ISBN 978-0-387-84857-0, 2009."
---

# Introduction

Dropout prediction is a recurring problem in higher education [@hastie2009]. Gradient
boosting [@friedman2001] has become a strong baseline. @fig:auc summarises the results and
@tbl:data describes the data.

# Method

## Data

Table: Dataset summary {#tbl:data}

| Cohort | Students | Dropout rate |
|:-------|---------:|-------------:|
| 2021   | 1,590    | 18.2%        |
| 2022   | 1,611    | 17.5%        |
| 2023   | 1,611    | 16.9%        |

## Model

The model minimises the loss

$$ L = \sum_{i=1}^{n} \ell\left(y_i, F(x_i)\right) + \lambda \Omega(F) $$ {#eq:loss}

where $\lambda$ controls regularisation. Minimising @eq:loss uses:

1. a learning rate of 0.05;
2. 500 trees of depth 4.

# Results

![AUC of the compared models](example_figure.png){#fig:auc alt="Bar chart: AUC rises from 0.62 for logistic regression to 0.86 for the tuned gradient boosting model." width=11cm}

# Conclusions

Gradient boosting outperformed the baseline.
