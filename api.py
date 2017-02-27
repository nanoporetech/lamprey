from __future__ import print_function
import sys, os, zerorpc
sys.path.append(os.path.dirname(os.path.realpath(__file__)) + "/externals/nanonet")
from nanonet.nanonetcall import process_read as process_read

class RunnerApi(object):
    def process_read(self, filename):
        """basecall a given filename"""
        try:
            return process_read("/Users/rmp/dev/ONT/baserunner/externals/nanonet/nanonet/data/r9_template.npy", filename, section="template")
        except Exception as e:
            return str(e)
    def echo(self, text):
        """echo any text"""
        return text

def parse_port():
    return "4242"

def main():
    addr = 'tcp://127.0.0.1:' + parse_port()
    s = zerorpc.Server(RunnerApi())
    s.bind(addr)
    print('start running on {}'.format(addr))
    s.run()

if __name__ == '__main__':
    main()
