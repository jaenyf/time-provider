# Benchmark History

Auto-generated and triggered by [last release](https://github.com/jaenyf/time-provider/actions/workflows/release-please.yml).
<!-- benchmark-history:start -->

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
