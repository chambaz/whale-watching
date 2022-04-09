import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en.json'

TimeAgo.addDefaultLocale(en)

function App() {
  const [whaleLimit, setWhaleLimit] = useState(10)
  const [ethPrice, setEthPrice] = useState(0)
  const [currentBlock, setCurrentBlock] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [whaleTransactions, setWhaleTransactions] = useState([])
  const [loadingMessage, setLoadingMessage] = useState(
    'shhh, wait for whales on the next block...'
  )
  const timeAgo = new TimeAgo('en-US')

  const truncate = (str, dynamic = true) => {
    let full = false

    if (dynamic) {
      full = window?.outerWidth >= 768
    }

    return full ? str.slice(0, 5) + '...' + str.slice(-5) : str.slice(0, 6)
  }

  const ethToUsd = (eth, full = false) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: full ? 2 : 0,
    }).format(eth * ethPrice)
  }

  const fetchTransactions = async () => {
    console.log(
      'Starting provider websocket 🔌',
      process.env.REACT_APP_ALCHEMY_WS_URL
    )

    const provider = new ethers.providers.WebSocketProvider(
      process.env.REACT_APP_ALCHEMY_WS_URL
    )

    const filter = {
      topics: [ethers.utils.id('Transfer(address,address,uint256)')],
    }

    const txHashes = []

    const initialBlock = await provider.getBlock()

    console.log('Current block 🧱', initialBlock.number)
    setCurrentBlock(initialBlock.number)

    fetchEthPrice()

    provider.on('block', (blockNumber) => {
      console.log('New block 🧱', blockNumber)
      fetchEthPrice()
      setCurrentBlock(blockNumber)
    })

    provider.on(filter, async (log, event) => {
      const transaction = await provider.getTransaction(log.transactionHash)

      if (!transaction) {
        return
      }

      const val = Number(ethers.utils.formatUnits(transaction.value))

      if (Math.round(val) >= 0.1) {
        transaction.date = new Date()
        transaction.formattedValue = Math.round(val * 100) / 100

        if (txHashes.indexOf(transaction.hash) > -1) {
          return
        }

        setTransactions((transactions) => {
          const txs = [...transactions, transaction]
          txs.sort((a, b) => (a.formattedValue < b.formattedValue ? 1 : -1))
          return txs
        })

        txHashes.push(transaction.hash)
      }
    })
  }

  const fetchEthPrice = async () => {
    return new Promise(async (resolve) => {
      const res = await fetch(
        'https://data.messari.io/api/v1/assets/eth/metrics'
      )
      const json = await res.json()

      if (json.data.market_data.price_usd) {
        console.log('Fetching eth price 📈', json.data.market_data.price_usd)
        setEthPrice(json.data.market_data.price_usd)
        resolve()
      }
    })
  }

  useEffect(() => {
    setWhaleTransactions(
      transactions.filter((tx) => {
        return tx.formattedValue >= whaleLimit
      })
    )
  }, [whaleLimit, transactions])

  useEffect(() => {
    fetchTransactions()
    setTimeout(() => {
      setLoadingMessage(
        'No transactions yet, try reducing the minimum transaction value above 👆'
      )
    }, 10000)
  }, [])

  return (
    <>
      <main className="flex flex-col items-center w-screen h-screen pb-16 overflow-auto bg-gray-900 text-gray-50">
        <div className="w-full py-2 font-bold text-center bg-gradient-to-r from-violet-500 to-fuchsia-500">
          Built by{' '}
          <a href="https://www.chambaz.tech/" className="border-b-2">
            chambaz.eth
          </a>
          , say{' '}
          <a href="https://twitter.com/chambaz" className="border-b-2">
            hello 👋
          </a>
          .
        </div>
        <header className="px-4 pt-12 space-y-6 text-center md:pt-32">
          <p className="text-8xl">🐳</p>
          <h1 className="text-6xl font-extrabold">Whale Watching</h1>
        </header>
        <div className="flex flex-col w-full max-w-2xl px-10 mx-auto mt-12 md:mt-16 md:px-2">
          <label htmlFor="minValue" className="mb-2 form-label">
            <strong>Minimum Value:</strong> {whaleLimit} ETH (
            {ethToUsd(whaleLimit, true)})
          </label>
          <input
            type="range"
            className="form-range before:appearance-none before:w-full before:h-6 before:p-0 before:bg-transparent before:focus:outline-none focus:ring-0 focus:shadow-none"
            min="0"
            max="1000"
            step="1"
            id="minValue"
            value={whaleLimit}
            onChange={(e) => setWhaleLimit(Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col mx-4 mt-14 md:mt-20">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            {!whaleTransactions.length && (
              <div className="flex flex-col items-center text-center">
                <p>{loadingMessage}</p>
                <p className="mt-2 mb-4 text-xs italic">
                  <strong>Current Block</strong>: {currentBlock}
                </p>
                <TailSpin
                  heigth="40"
                  width="40"
                  color="#8b5cf6"
                  ariaLabel="loading"
                />
              </div>
            )}
            {whaleTransactions.length > 0 && (
              <>
                <p className="mb-2 text-xs">
                  <strong>Current Block</strong>: {currentBlock}
                </p>
                <div className="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
                  <table className="divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-8"></th>
                        <th
                          scope="col"
                          className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Tx
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          From
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          To
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:pr-12">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((tx, index) => {
                        if (tx.formattedValue < whaleLimit) {
                          return
                        }

                        return (
                          <tr
                            className={`${
                              index % 2 !== 0 ? 'bg-gray-50' : ''
                            }  text-gray-500 cursor-pointer hover:bg-cyan-50`}
                            key={index}
                            onClick={() => {
                              window.open(`https://etherscan.io/tx/${tx.hash}`)
                            }}>
                            <td className="px-3 py-4 text-xs whitespace-nowrap sm:pl-8">
                              {timeAgo.format(tx.date, 'mini')} ago
                            </td>
                            <td className="hidden px-3 py-4 text-sm font-bold sm:table-cell whitespace-nowrap text-cyan-700">
                              {truncate(tx.hash, false)}
                            </td>
                            <td className="px-3 py-4 text-sm whitespace-nowrap">
                              {truncate(tx.from)}
                            </td>
                            <td className="px-3 py-4 text-sm whitespace-nowrap">
                              {truncate(tx.to)}
                            </td>
                            <td className="px-3 py-4 text-sm font-bold whitespace-nowrap sm:pr-12">
                              {tx.formattedValue}Ξ
                              {` (${ethToUsd(tx.formattedValue)})`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default App
