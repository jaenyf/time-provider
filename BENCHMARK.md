# Benchmark History

Auto-generated and triggered by [last release](https://github.com/jaenyf/time-provider/actions/workflows/release-please.yml).
<!-- benchmark-history:start -->

## 2026-09-20T22:23:03.364Z - ([b8f1384](https://github.com/jaenyf/time-provider/commit/b8f1384))

### schedule 5000 timeouts, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3310.86 |    0.3020 |   0.8193 |    9087 |
| time-provider (manual)     | 3186.88 |    0.3138 |   0.7929 |    8929 |
| sinon fake-timers          |  245.37 |    4.0755 |  13.8873 |    1447 |
| jest fake-timers (modern)  |  244.99 |    4.0817 |  16.1804 |    1430 |

**✅ time-provider (sequential)** is fastest:

- 1.04x faster than time-provider (manual)
- 13.49x faster than sinon fake-timers
- 13.51x faster than jest fake-timers (modern)

### schedule 5000 timeouts, with time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 2650.14 |    0.3773 |   1.1016 |    7359 |
| time-provider (manual)     | 2541.22 |    0.3935 |   1.1040 |    7335 |
| sinon fake-timers          |  205.73 |    4.8607 |  15.9276 |    1236 |
| jest fake-timers (modern)  |  196.53 |    5.0883 |  16.3846 |    1186 |

**✅ time-provider (sequential)** is fastest:

- 1.04x faster than time-provider (manual)
- 12.88x faster than sinon fake-timers
- 13.48x faster than jest fake-timers (modern)

### schedule 5000 timeouts queueing 1 microtask each, with time advance and drain _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 2242.35 |    0.4460 |   0.8917 |    6418 |
| time-provider (manual)     | 2172.24 |    0.4604 |   0.9890 |    6126 |
| sinon fake-timers          |  198.26 |    5.0438 |  16.7765 |    1189 |
| jest fake-timers (modern)  |  190.06 |    5.2615 |  16.1029 |    1155 |

**✅ time-provider (sequential)** is fastest:

- 1.03x faster than time-provider (manual)
- 11.31x faster than sinon fake-timers
- 11.80x faster than jest fake-timers (modern)

### schedule 5000 timeouts queueing 10 microtasks each, with time advance and drain _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 2029.65 |    0.4927 |   0.9390 |    5842 |
| time-provider (manual)     | 1968.01 |    0.5081 |   0.9734 |    5681 |
| sinon fake-timers          |  170.47 |    5.8663 |  14.8390 |    1033 |
| jest fake-timers (modern)  |  153.26 |    6.5248 |  16.5616 |     950 |

**✅ time-provider (sequential)** is fastest:

- 1.03x faster than time-provider (manual)
- 11.91x faster than sinon fake-timers
- 13.24x faster than jest fake-timers (modern)

### schedule 5000 intervals, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3698.72 |    0.2704 |   0.7411 |   10164 |
| time-provider (manual)     | 3647.88 |    0.2741 |   0.7595 |    9880 |
| sinon fake-timers          |  237.13 |    4.2171 |  14.9295 |    1413 |
| jest fake-timers (modern)  |  226.48 |    4.4155 |  15.3312 |    1368 |

**✅ time-provider (sequential)** is fastest:

- 1.01x faster than time-provider (manual)
- 15.60x faster than sinon fake-timers
- 16.33x faster than jest fake-timers (modern)

### schedule 5000 intervals, with time advance _(median across 5 passes)_

| name                       |     hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -----: | --------: | -------: | ------: |
| time-provider (sequential) | 180.30 |    5.5462 |   8.9674 |     550 |
| time-provider (manual)     | 176.96 |    5.6510 |  10.0399 |     544 |
| sinon fake-timers          |  12.48 |   80.1271 |  95.9261 |     170 |
| jest fake-timers (modern)  |  10.93 |   91.4791 | 112.4349 |     170 |

**✅ time-provider (sequential)** is fastest:

- 1.02x faster than time-provider (manual)
- 14.45x faster than sinon fake-timers
- 16.49x faster than jest fake-timers (modern)

### schedule 5000 intervals queueing 1 microtask each, with time advance and drain _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3034.19 |    0.3296 |   0.8635 |    8464 |
| time-provider (manual)     | 2963.31 |    0.3375 |   0.8894 |    8247 |
| sinon fake-timers          |  178.40 |    5.6054 |  14.5207 |    1071 |
| jest fake-timers (modern)  |  168.95 |    5.9188 |  16.1766 |    1030 |

**✅ time-provider (sequential)** is fastest:

- 1.02x faster than time-provider (manual)
- 17.01x faster than sinon fake-timers
- 17.96x faster than jest fake-timers (modern)

### schedule 5000 intervals queueing 10 microtasks each, with time advance and drain _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 2759.79 |    0.3623 |   0.9221 |    7808 |
| time-provider (sequential) | 2747.10 |    0.3640 |   0.9381 |    7819 |
| sinon fake-timers          |  166.22 |    6.0161 |  15.1299 |    1005 |
| jest fake-timers (modern)  |  159.63 |    6.2644 |  16.5339 |     963 |

**✅ time-provider (manual)** is fastest:

- 1.00x faster than time-provider (sequential)
- 16.60x faster than sinon fake-timers
- 17.29x faster than jest fake-timers (modern)

### queue 5000 microtasks, and drain without time advance _(median across 5 passes)_

| name                       |       hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -------: | --------: | -------: | ------: |
| time-provider (manual)     | 15632.24 |    0.0640 |   0.1091 |   38349 |
| time-provider (sequential) | 15370.14 |    0.0651 |   0.3611 |   37387 |
| sinon fake-timers          |  2130.80 |    0.4693 |   1.2779 |   10958 |
| jest fake-timers (modern)  |  2048.92 |    0.4881 |   1.3008 |   10533 |

**✅ time-provider (manual)** is fastest:

- 1.02x faster than time-provider (sequential)
- 7.34x faster than sinon fake-timers
- 7.63x faster than jest fake-timers (modern)

### queue 5000 microtasks, with time advance and drain _(median across 5 passes)_

| name                       |       hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -------: | --------: | -------: | ------: |
| time-provider (sequential) | 15836.67 |    0.0631 |   0.1079 |   38992 |
| time-provider (manual)     | 15558.17 |    0.0643 |   0.1085 |   38493 |
| sinon fake-timers          |  2140.21 |    0.4672 |   1.2702 |   10983 |
| jest fake-timers (modern)  |  2011.80 |    0.4971 |   1.3223 |   10343 |

**✅ time-provider (sequential)** is fastest:

- 1.02x faster than time-provider (manual)
- 7.40x faster than sinon fake-timers
- 7.87x faster than jest fake-timers (modern)

### request 5000 idle callbacks, and drain _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 1822.97 |    0.5486 |   1.1912 |    5324 |
| time-provider (sequential) | 1806.56 |    0.5535 |   1.1965 |    5267 |
| sinon fake-timers          |   64.64 |   15.4696 |  21.8829 |     417 |
| jest fake-timers (modern)  |   57.33 |   17.4423 |  30.3165 |     378 |

**✅ time-provider (manual)** is fastest:

- 1.01x faster than time-provider (sequential)
- 28.20x faster than sinon fake-timers
- 31.80x faster than jest fake-timers (modern)

### read now 5000 times _(median across 5 passes)_

| name                      |      hz | mean (ms) | p99 (ms) | samples |
| ------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)    | 3461.46 |    0.2889 |   0.4696 |    9587 |
| jest fake-timers (modern) |  509.52 |    1.9626 |   2.4861 |    1480 |
| sinon fake-timers         |  505.98 |    1.9764 |   2.7634 |    1449 |

**✅ time-provider (manual)** is fastest:

- 6.79x faster than jest fake-timers (modern)
- 6.84x faster than sinon fake-timers

## 2026-09-14T07:43:01.800Z - ([a703555](https://github.com/jaenyf/time-provider/commit/a703555))

### schedule 5000 timeouts, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 2903.83 |    0.3444 |   0.8886 |    8032 |
| time-provider (manual)     | 2897.21 |    0.3452 |   0.9240 |    7948 |
| jest fake-timers (modern)  |  190.06 |    5.2616 |  18.7403 |    1132 |
| sinon fake-timers          |  188.22 |    5.3130 |  15.6482 |    1123 |

**✅ time-provider (sequential)** is fastest:

- 1.00x faster than time-provider (manual)
- 15.28x faster than jest fake-timers (modern)
- 15.43x faster than sinon fake-timers

### schedule 5000 timeouts, with time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 2405.49 |    0.4157 |   0.9494 |    6747 |
| time-provider (manual)     | 2336.57 |    0.4280 |   0.9386 |    6576 |
| sinon fake-timers          |  163.05 |    6.1330 |  16.1772 |     988 |
| jest fake-timers (modern)  |  152.69 |    6.5490 |  20.3385 |     936 |

**✅ time-provider (sequential)** is fastest:

- 1.03x faster than time-provider (manual)
- 14.75x faster than sinon fake-timers
- 15.75x faster than jest fake-timers (modern)

### schedule 5000 intervals, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3620.33 |    0.2762 |   0.7602 |    9934 |
| time-provider (manual)     | 3568.32 |    0.2802 |   0.7685 |    9857 |
| sinon fake-timers          |  191.79 |    5.2139 |  16.0297 |    1153 |
| jest fake-timers (modern)  |  182.33 |    5.4846 |  16.2164 |    1109 |

**✅ time-provider (sequential)** is fastest:

- 1.01x faster than time-provider (manual)
- 18.88x faster than sinon fake-timers
- 19.86x faster than jest fake-timers (modern)

### schedule 5000 intervals, with time advance _(median across 5 passes)_

| name                       |     hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -----: | --------: | -------: | ------: |
| time-provider (sequential) | 175.37 |    5.7022 |   9.6196 |     540 |
| time-provider (manual)     | 175.09 |    5.7113 |   9.0223 |     539 |
| sinon fake-timers          |  10.38 |   96.3637 | 121.4110 |     170 |
| jest fake-timers (modern)  |   9.79 |  102.1936 | 131.3996 |     170 |

**✅ time-provider (sequential)** is fastest:

- 1.00x faster than time-provider (manual)
- 16.90x faster than sinon fake-timers
- 17.92x faster than jest fake-timers (modern)

### read now 5000 times _(median across 5 passes)_

| name                      |      hz | mean (ms) | p99 (ms) | samples |
| ------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)    | 2667.98 |    0.3748 |   0.6625 |    7476 |
| sinon fake-timers         |  364.02 |    2.7471 |   3.8541 |    1054 |
| jest fake-timers (modern) |  363.97 |    2.7475 |   3.9217 |    1051 |

**✅ time-provider (manual)** is fastest:

- 7.33x faster than sinon fake-timers
- 7.33x faster than jest fake-timers (modern)

## 2026-08-10T15:36:38.670Z - ([4c87692](https://github.com/jaenyf/time-provider/commit/4c87692))

### schedule 5000 timeouts, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 4223.52 |    0.2368 |   0.6949 |   11121 |
| time-provider (manual)     | 3827.49 |    0.2613 |   0.7803 |   10703 |
| sinon fake-timers          |  196.00 |    5.1021 |  18.1675 |    1157 |
| jest fake-timers (modern)  |  192.94 |    5.1829 |  19.3129 |    1157 |

**✅ time-provider (sequential)** is fastest:

- 1.10x faster than time-provider (manual)
- 21.55x faster than sinon fake-timers
- 21.89x faster than jest fake-timers (modern)

### schedule 5000 timeouts, with time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (sequential) | 3183.00 |    0.3142 |   0.8259 |    8730 |
| time-provider (manual)     | 3160.49 |    0.3164 |   0.8169 |    8686 |
| sinon fake-timers          |  164.31 |    6.0861 |  17.8044 |     984 |
| jest fake-timers (modern)  |  155.43 |    6.4338 |  20.7624 |     946 |

**✅ time-provider (sequential)** is fastest:

- 1.01x faster than time-provider (manual)
- 19.37x faster than sinon fake-timers
- 20.48x faster than jest fake-timers (modern)

### schedule 5000 intervals, without time advance _(median across 5 passes)_

| name                       |      hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)     | 5186.86 |    0.1928 |   0.6190 |   13708 |
| time-provider (sequential) | 5178.96 |    0.1931 |   0.7287 |   12877 |
| sinon fake-timers          |  193.58 |    5.1659 |  16.4986 |    1172 |
| jest fake-timers (modern)  |  186.05 |    5.3748 |  16.7576 |    1117 |

**✅ time-provider (manual)** is fastest:

- 1.00x faster than time-provider (sequential)
- 26.79x faster than sinon fake-timers
- 27.88x faster than jest fake-timers (modern)

### schedule 5000 intervals, with time advance _(median across 5 passes)_

| name                       |     hz | mean (ms) | p99 (ms) | samples |
| -------------------------- | -----: | --------: | -------: | ------: |
| time-provider (manual)     | 162.97 |    6.1360 |  11.4427 |     507 |
| time-provider (sequential) | 161.79 |    6.1809 |  11.2922 |     509 |
| sinon fake-timers          |  10.20 |   98.0849 | 113.3520 |     170 |
| jest fake-timers (modern)  |   9.64 |  103.7640 | 123.2886 |     170 |

**✅ time-provider (manual)** is fastest:

- 1.01x faster than time-provider (sequential)
- 15.99x faster than sinon fake-timers
- 16.91x faster than jest fake-timers (modern)

### read now 5000 times _(median across 5 passes)_

| name                      |      hz | mean (ms) | p99 (ms) | samples |
| ------------------------- | ------: | --------: | -------: | ------: |
| time-provider (manual)    | 2716.58 |    0.3681 |   0.6254 |    7592 |
| jest fake-timers (modern) |  399.78 |    2.5014 |   3.2110 |    1141 |
| sinon fake-timers         |  391.66 |    2.5532 |   3.7211 |    1129 |

**✅ time-provider (manual)** is fastest:

- 6.80x faster than jest fake-timers (modern)
- 6.94x faster than sinon fake-timers

## 2026-08-01T10:30:35.885Z - ([83a25f0](https://github.com/jaenyf/time-provider/commit/83a25f0))

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

## 2026-08-01T10:05:36.991Z - ([8b09e42](https://github.com/jaenyf/time-provider/commit/8b09e42))

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

## 2026-07-25T20:16:36.601Z - ([6a2a3d5](https://github.com/jaenyf/time-provider/commit/6a2a3d5))

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
