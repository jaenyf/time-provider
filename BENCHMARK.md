# Benchmark History

Auto-generated and triggered by [last release](https://github.com/jaenyf/time-provider/actions/workflows/release-please.yml).
<!-- benchmark-history:start -->

## 2026-08-01T10:30:35.885Z - ([83a25f0](83a25f0))

### schedule 5000 timeouts, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 8213.74 |    0.1217 |   0.5054 |   20815 |
| time-provider (sequential) | 8135.21 |    0.1229 |   0.4279 |   22167 |
| sinon fake-timers          |  345.69 |    2.8928 |  11.5824 |    2026 |
| jest fake-timers (modern)  |  330.05 |    3.0298 |  12.1291 |    1928 |

**✅ time-provider (manual)** is fastest:

- 1.01x faster than time-provider (sequential)
- 23.76x faster than sinon fake-timers
- 24.89x faster than jest fake-timers (modern)

### schedule 5000 timeouts, with time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 4350.78 |    0.2298 |   0.6265 |   12127 |
| time-provider (manual)     | 4349.67 |    0.2299 |   0.6212 |   12141 |
| sinon fake-timers          |  267.68 |    3.7358 |  12.3532 |    1584 |
| jest fake-timers (modern)  |  259.22 |    3.8577 |  13.1617 |    1523 |

**✅ time-provider (sequential)** is fastest:

- 1.00x faster than time-provider (manual)
- 16.25x faster than sinon fake-timers
- 16.78x faster than jest fake-timers (modern)

### schedule 5000 intervals, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 7304.88 |    0.1369 |   0.4931 |   20452 |
| time-provider (sequential) | 7131.38 |    0.1402 |   0.5109 |   19912 |
| sinon fake-timers          |  325.54 |    3.0718 |  12.2792 |    1916 |
| jest fake-timers (modern)  |  316.48 |    3.1597 |  11.9690 |    1871 |

**✅ time-provider (manual)** is fastest:

- 1.02x faster than time-provider (sequential)
- 22.44x faster than sinon fake-timers
- 23.08x faster than jest fake-timers (modern)

### schedule 5000 intervals, with time advance _(median across 5 passes)_

| name                       |     hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -----: | --------: | -------: | ------: |
| time-provider (sequential) | 213.25 |    4.6894 |   7.3699 |     658 |
| time-provider (manual)     | 212.33 |    4.7097 |   8.5835 |     670 |
| sinon fake-timers          |  15.45 |   64.7103 |  72.4722 |     170 |
| jest fake-timers (modern)  |  14.66 |   68.2213 |  79.0409 |     170 |

**✅ time-provider (sequential)** is fastest:

- 1.00x faster than time-provider (manual)
- 13.80x faster than sinon fake-timers
- 14.55x faster than jest fake-timers (modern)

### read now 5000 times _(median across 5 passes)_

| name                      |      hz | mean (ms) | p99 (ms) | samples |
| ------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)    | 4733.34 |    0.2113 |   0.3866 |   13470 |
| jest fake-timers (modern) |  732.77 |    1.3647 |   1.7539 |    2094 |
| sinon fake-timers         |  721.46 |    1.3861 |   1.7718 |    2057 |

**✅ time-provider (manual)** is fastest:

- 6.46x faster than jest fake-timers (modern)
- 6.56x faster than sinon fake-timers

## 2026-08-01T10:05:36.991Z - ([8b09e42](8b09e42))

### schedule 5000 timeouts, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 4874.73 |    0.2051 |   0.5843 |   13935 |
| time-provider (sequential) | 4873.20 |    0.2052 |   0.5975 |   13870 |
| jest fake-timers (modern)  |  189.35 |    5.2812 |  18.8751 |    1128 |
| sinon fake-timers          |  187.82 |    5.3242 |  17.9011 |    1110 |

**✅ time-provider (manual)** is fastest:

- 1.00x faster than time-provider (sequential)
- 25.74x faster than jest fake-timers (modern)
- 25.95x faster than sinon fake-timers

### schedule 5000 timeouts, with time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3950.67 |    0.2531 |   0.7922 |   11072 |
| time-provider (manual)     | 3917.63 |    0.2553 |   0.7908 |   11136 |
| sinon fake-timers          |  156.66 |    6.3831 |  18.9715 |     945 |
| jest fake-timers (modern)  |  147.82 |    6.7649 |  20.2338 |     902 |

**✅ time-provider (sequential)** is fastest:

- 1.01x faster than time-provider (manual)
- 25.22x faster than sinon fake-timers
- 26.73x faster than jest fake-timers (modern)

### schedule 5000 intervals, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 6416.92 |    0.1558 |   0.6276 |   18507 |
| time-provider (manual)     | 6290.15 |    0.1590 |   0.6483 |   18260 |
| sinon fake-timers          |  190.96 |    5.2366 |  18.7372 |    1135 |
| jest fake-timers (modern)  |  181.85 |    5.4989 |  18.6722 |    1091 |

**✅ time-provider (sequential)** is fastest:

- 1.02x faster than time-provider (manual)
- 33.60x faster than sinon fake-timers
- 35.29x faster than jest fake-timers (modern)

### schedule 5000 intervals, with time advance _(median across 5 passes)_

| name                       |     hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -----: | --------: | -------: | ------: |
| time-provider (sequential) | 181.61 |    5.5062 |   9.7305 |     559 |
| time-provider (manual)     | 171.72 |    5.8233 |  10.4779 |     534 |
| sinon fake-timers          |   9.59 |  104.2211 | 117.4652 |     170 |
| jest fake-timers (modern)  |   9.22 |  108.4563 | 133.2358 |     170 |

**✅ time-provider (sequential)** is fastest:

- 1.06x faster than time-provider (manual)
- 18.93x faster than sinon fake-timers
- 19.70x faster than jest fake-timers (modern)

### read now 5000 times _(median across 5 passes)_

| name                      |      hz | mean (ms) | p99 (ms) | samples |
| ------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)    | 2777.31 |    0.3601 |   0.6352 |    7783 |
| jest fake-timers (modern) |  410.88 |    2.4338 |   3.4335 |    1162 |
| sinon fake-timers         |  404.25 |    2.4737 |   3.2829 |    1165 |

**✅ time-provider (manual)** is fastest:

- 6.76x faster than jest fake-timers (modern)
- 6.87x faster than sinon fake-timers

## 2026-07-25T20:16:36.601Z - ([6a2a3d5](6a2a3d5))

### schedule 5000 timeouts, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 2920.40 |    0.3424 |   1.1536 |    8039 |
| time-provider (sequential) | 2888.18 |    0.3462 |   1.2297 |    7993 |
| sinon fake-timers          |  194.54 |    5.1404 |  18.4373 |    1167 |
| jest fake-timers (modern)  |  186.77 |    5.3541 |  19.2151 |    1116 |

**✅ time-provider (manual)** is fastest:

- 1.01x faster than time-provider (sequential)
- 15.01x faster than sinon fake-timers
- 15.64x faster than jest fake-timers (modern)

### schedule 5000 timeouts, with time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 2452.38 |    0.4078 |   1.0035 |    6898 |
| time-provider (manual)     | 2421.66 |    0.4129 |   1.0198 |    6846 |
| sinon fake-timers          |  160.50 |    6.2306 |  19.3719 |     954 |
| jest fake-timers (modern)  |  153.33 |    6.5217 |  21.3922 |     923 |

**✅ time-provider (sequential)** is fastest:

- 1.01x faster than time-provider (manual)
- 15.28x faster than sinon fake-timers
- 15.99x faster than jest fake-timers (modern)

### schedule 5000 intervals, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3137.14 |    0.3188 |   0.8108 |    8786 |
| time-provider (manual)     | 3042.43 |    0.3287 |   1.0688 |    8208 |
| sinon fake-timers          |  193.00 |    5.1813 |  17.3529 |    1160 |
| jest fake-timers (modern)  |  183.23 |    5.4576 |  18.2305 |    1100 |

**✅ time-provider (sequential)** is fastest:

- 1.03x faster than time-provider (manual)
- 16.25x faster than sinon fake-timers
- 17.12x faster than jest fake-timers (modern)

### schedule 5000 intervals, with time advance _(median across 5 passes)_

| name                       |     hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -----: | --------: | -------: | ------: |
| time-provider (manual)     | 159.99 |    6.2505 |  13.1819 |     494 |
| time-provider (sequential) | 159.82 |    6.2569 |  12.9131 |     496 |
| sinon fake-timers          |   9.95 |  100.4877 | 114.3203 |     170 |
| jest fake-timers (modern)  |   9.41 |  106.3207 | 127.5383 |     170 |

**✅ time-provider (manual)** is fastest:

- 1.00x faster than time-provider (sequential)
- 16.08x faster than sinon fake-timers
- 17.01x faster than jest fake-timers (modern)

### read now 5000 times _(median across 5 passes)_

| name                      |      hz | mean (ms) | p99 (ms) | samples |
| ------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)    | 2624.30 |    0.3811 |   0.6374 |    7379 |
| sinon fake-timers         |  423.81 |    2.3596 |   3.1533 |    1214 |
| jest fake-timers (modern) |  418.50 |    2.3895 |   3.3136 |    1209 |

**✅ time-provider (manual)** is fastest:

- 6.19x faster than sinon fake-timers
- 6.27x faster than jest fake-timers (modern)

<!-- benchmark-history:end -->
